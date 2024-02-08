
let ipSalt = "$rviE85fK@yJk*^@#$8n!AQ&qAWw%!!ZPVRiLi7&v#7uEUjoyrxA&QYwo^bjUEqWDUnh6eFbwKnnwjottpuDiB#3at#g^HM9nbG^Dc8!&5Xv#NgJEECdTt4wtJ84M!P4";
let encryptKey1 = "RTjjDmLfYnaDTZ6@N!uHsQ*rnGq@Ze*&$*HuVTMYiPcnScU^^MFNg5nyeLT7PWFGoH35hczBA33B!9#3W7#dfHWvy7gex86Cbpwy8zvouatmJyV#Y&xECEV3FKGFxKd@";
let encryptKey2 = "P$E7oXSTt$!ga&hkz83A4%BfA#%DgTyc8X3mFZh7y7qaA%dg&&!kFGC4x$5jc!3Q48s%q@9Q%j4A*LLsX%9CrK^jJH852VVQSKanWynct!wJ7EcLGMb7dTeRqsQvmdzBm5VdqJy#D5Rima^hhLyryXLZhuxE5#uC%pwfCcn3mY#yGptJ^wrqrhavgcPC3Jru2zYqr!U5*gwwQ84RGz%VHVb6pKBvzzi#5wPHAYsL&wSBN!g_c.z3h(372)kkCHGC3iWEr5iHzCDR^B7aW!ENpC&!FKyjueD5##HBqzLShc3d@Xz#%zzPRRsBHX*oDwqri!djzeDYUiusM9Hhsw3v5$s#j47YbiLbG^yh3j&pp759!GT^9Qm9Lw3MK8woLL3H$@KnhF5Kd";

let origin = window.location.origin;

async function sha256(data) {
    const buffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function getIp() {
    return await (await fetch(origin + '/.nexus/ip')).text();
}

async function getChallenge(key) {
    let data = { 'key': key };
    return await (await fetch(origin + '/.nexus/interact', {
        "headers": {
            'content-type': 'application/json',
        },
        "body": JSON.stringify(data),
        "method": "POST"
    })).json();
}

async function validateSolution(path, body, payload) {
    return await (await fetch(origin + '/.nexus/interact/' + path, {
        "headers": {
            "content-type": "application/json",
            "Payload": payload, "accept": "application/json, text/plain, */*",
        },
        "body": JSON.stringify(body),
        "method": "POST",
    })).text();
}

async function getPass(token) {
    return await fetch(origin + '/.nexus/request_connector', {
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
        'jsfp': 'https://discord.gg/keybypass',
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
        await getPass(hashedChallenge);
        window.location.assign(decodeURIComponent(new URL(window.location.href).searchParams.get("destination")));
    }
}

jsc();
