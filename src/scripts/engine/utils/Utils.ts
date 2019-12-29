export function loadResource(url: string, callback: Function) {
    const request = new XMLHttpRequest();
    request.open('GET', url + '?' + performance.now(), true);
    request.onload = function () {
        if (request.status === 200) {
            callback(request.responseText);
        } else {
            callback('Error ' + request.status);
        }
    }
}