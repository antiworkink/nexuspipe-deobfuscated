
ipSalt = "obnot38Z9KLbwAaB2uwvmjJTNNdG5gzH";
encryptKey1 = "m59wwebaANHiHzx92pXhu8LgKSEQuqvt";
encryptKey2 = "DdCAQEkvvcUwXyef9Bz4A4HCx97AnR84";

async function sha256(data) {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function getIp() {
    return await (await fetch(`https://${new URL(window.location.href).hostname}/.nexus/ip`)).text();
}

async function getChallenge(key) {
    let data = { 'key': key };
    return await (await fetch(`https://${new URL(window.location.href).hostname}/.nexus/interact`, {
        "headers": {
            'content-type': 'application/json',
        },
        "body": JSON.stringify(data),
        "method": "POST"
    })).json();
}

async function validateSolution(path, body, payload) {
    return await (await fetch(`https://${new URL(window.location.href).hostname}/.nexus/interact/${path}`, {
        "headers": {
            "content-type": "application/json",
            "Payload": payload, "accept": "application/json, text/plain, */*",
        },
        "body": JSON.stringify(body),
        "method": "POST",
    })).text();
}

async function getPass(token) {
    return await fetch(`https://${new URL(window.location.href).hostname}/.nexus/request_connector`, {
        method: 'POST',
        headers: {
            token: token
        }
    });
}

async function solveJsChallenge(hashedChallenge, difficulty) {
    let goal = "0".repeat(difficulty);
    let challengeAttempt = hashedChallenge;
    let counter = 0;
    while (!challengeAttempt.startsWith(goal)) {
        challengeAttempt = await sha256(hashedChallenge + counter);
        counter++;
    }
    return counter - 1;
}

function encodeStrings(string1, string2) {
    let toCharCodes = str => str.split("").map(char => char.charCodeAt(0));
    let toPaddedHex = num => ("0" + Number(num).toString(16)).substr(-2);
    let xorCharCodes = dataCharCodes => toCharCodes(string1).reduce((acc, curr) => acc ^ curr, dataCharCodes);
    return string2.split("").map(toCharCodes).map(xorCharCodes).map(toPaddedHex).join("");
}

async function jsc() {
    let ip = await getIp();
    let key = await sha256(ip + ipSalt);
    let challenge = await getChallenge(key);
    let hashedChallenge = await sha256(challenge.secret);
    let nonce = await solveJsChallenge(hashedChallenge, challenge.difficulty);
    let payloadData = {
        'solution': nonce,
        'isBot': false,
        'jsfp': 'https://discord.com/invite/92p6X2drxn',
        'secret': challenge.secret
    }
    let payload = encodeStrings(encryptKey1, JSON.stringify(payloadData));
    let bodyData = {
        'key': key,
        'snitch': encodeStrings(encryptKey1, encryptKey2),
        'ramp': encodeStrings(hashedChallenge, encryptKey2),
        'tod': (new Date()).toISOString(),
        [encodeStrings(nonce.toString(), encryptKey2)]: encodeStrings(encryptKey2, nonce.toString())
    }
    let res = await validateSolution(hashedChallenge, bodyData, payload);
    if (res == "OK") {
        getPass(hashedChallenge);
    }
}

jsc();
