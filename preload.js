const fs = require("fs");
const path = require("path");
const superagent = require("superagent");
const randomIp = require("chinese-random-ip");
const progressStream = require("progress-stream");

const defaultConfig = {
    "config-filename": {
        id: "config-filename",
        value: "{file_name}_FileConverter",
    },
    "config-path": {
        id: "config-path",
        value: utools.getPath("downloads"),
    },
    "config-silence": {
        id: "config-silence",
        value: false,
    },
    "config-autosave": {
        id: "config-autosave",
        value: true,
    },
    "config-api": {
        id: "config-api",
        value: "alltoall",
    }
};

utools.onPluginEnter(({ code, type, payload }) => {
    console.log(payload);
    payload.forEach((input) => {
        if (input.isFile) {
            init(input);
        }
    });
    Object.getOwnPropertyNames(defaultConfig).forEach((config) => {
        if (utools.dbStorage.getItem(config) === null) {
            utools.dbStorage.setItem(config, defaultConfig[config].value);
        }
    });
});

window.restoreConfig = function restoreConfig() {
    Object.getOwnPropertyNames(defaultConfig).forEach((config) => {
        utools.dbStorage.setItem(config, defaultConfig[config].value);
    });
}

window.constructFileObject = function constructFileObject(file) {
    let date = new Date();
    return {
        agent: superagent.agent().set({
            referer: "http://www.alltoall.net",
            "x-forwarded-for": randomIp.getChineseIp(),
        }),
        path: path.resolve(file.path),
        id: Math.random().toString(36).slice(2),
        name: file.name.split("." + file.name.split(".").pop())[0],
        ext: file.name.split(".").pop(),
        time: date.toLocaleTimeString(),
    };
};

window.getExtOutput = async function getExtOutput(fileObj) {
    const url =
        "https://www.alltoall.net/qfy-content/plugins/qfy-customize-cloudconvert/convert.php";
    return await fileObj.agent
        .post(url)
        .field("action", "upload")
        .attach("files[]", fileObj.path)
        .on("progress", (event) => {
            let percent = ((event.loaded / event.total) * 100).toFixed(2);
            if (String(percent).split(".")[1] == "00")
                percent = String(percent).split(".")[0];
            fileObj.status = `上传中：${percent}%`;
            updateTable(fileObj);
        })
        .catch((err) => {
            if (err) {
                fileObj.status = `出现错误：${err}`;
                updateTable(fileObj);
            }
        })
        .then((res) => {
            let data = JSON.parse(res.text);
            fileObj.filename = data.file_name;
            fileObj.token = data.token;
            fileObj.input_type = data.ext;
            if (data.success) {
                return JSON.parse(res.text);
            } else {
                toastr.options = { positionClass: "toast-bottom-left" };
                toastr.error(data.error_msg);
                utools.showNotification(data.error_msg);
            }
        });
};

window.appendExtInfo = async function appendExtInfo(fileObj, data) {
    let DOM = `<select class="mdui-select" mdui-select>`;
    data.ext_output.forEach((ext) => {
        DOM += `<option value=${ext}>${ext}</option>`;
    });
    DOM += `</select>`;
    fileObj.status = DOM;
};

window.executeTransfer = async function executeTransfer(fileObj) {
    let rsp = await fileObj.agent
        .post(
            "https://www.alltoall.net/qfy-content/plugins/qfy-customize-cloudconvert/convert.php"
        )
        .type("form")
        .send({
            file_name: fileObj.filename,
            token: fileObj.token,
            action: "create",
            input_type: fileObj.input_type,
            output_type: fileObj.output_type,
        });
    let rspData = JSON.parse(rsp.text);
    fileObj.process_url = rspData.process_url;

    while (true) {
        setTimeout(1000);
        let rsp = await fileObj.agent
            .post(
                "https://www.alltoall.net/qfy-content/plugins/qfy-customize-cloudconvert/convert.php"
            )
            .type("form")
            .send({
                file_name: fileObj.filename,
                token: fileObj.token,
                action: "status",
                process_url: fileObj.process_url,
            })
            .catch((err) => {
                if (err) {
                    fileObj.status = `出现错误：${err}`;
                    updateTable(fileObj);
                }
            });
        let processData = JSON.parse(rsp.text);

        let percent = processData["percent"].toFixed(2);
        if (String(percent).split(".")[1] == "00") {
            percent = String(percent).split(".")[0];
            fileObj.status = `转换中：${percent}%`;
            updateTable(fileObj);
        }
        if (
            processData["percent"] == 100 &&
            Object.keys(processData).includes("output") &&
            Object.keys(processData["output"]).includes("url")
        ) {
            fileObj.download_url = processData["output"]["url"];
            downloadUrl(
                fileObj,
                `${utools.dbStorage.getItem("config-path")}\\${getFileName(
                    utools.dbStorage.getItem("config-filename"),
                    fileObj.name
                )}.${fileObj.output_type}`
            )
                .then(() => {
                    fileObj.status = "下载完成";
                    updateTable(fileObj);
                })
                .catch((err) => {
                    if (err) {
                        fileObj.status = `出现错误：${err}`;
                        updateTable(fileObj);
                    }
                });
            return;
        }
    }
};

window.downloadUrl = async function downloadUrl(fileObj, savePath) {
    let writeStream = fs.createWriteStream(savePath);
    let progress = progressStream({ length: "0" });
    if(utools.dbStorage.getItem("config-silence") === false) {
        utools.shellShowItemInFolder(savePath)
    }

    fileObj.agent.get(fileObj.download_url).pipe(progress).pipe(writeStream);

    progress.on("progress", (obj) => {
        let percent = obj.percentage.toFixed(2);
        if (String(percent).split(".")[1] == "00") {
            percent = String(percent).split(".")[0];
            fileObj.status = `下载中：${percent}%`;
            updateTable(fileObj);
        }
    });

    return new Promise((resolve, reject) => {
        writeStream.on("finish", resolve);
        writeStream.on("error", reject);
    });
};

window.overSize = function overSize(file) {
    let fileSize = fs.statSync(file.path).size;
    if (fileSize >= 20971520) {
        return true;
    } else {
        return false;
    }
};

function getFileName(configFilename, filename) {
    const customConfigs = [
        "{Y}",
        "{M}",
        "{D}",
        "{h}",
        "{m}",
        "{s}",
        "{ms_time_stamp}",
        "{s_time_stamp}",
        "{file_name}",
    ];
    customConfigs.forEach((config) => {
        let times = configFilename.split(config).length - 1; // more than one replacement character
        for (let i = 0; i < times; i++) {
            configFilename = configFilename.replace(
                config,
                replacement(config, filename)
            );
        }
    });
    return configFilename;
}
function replacement(config, filename) {
    let date = new Date();
    switch (config) {
        case "{Y}":
            return date.getFullYear();
        case "{M}":
            return date.getMonth() + 1;
        case "{D}":
            return date.getDay();
        case "{h}":
            return date.getHours();
        case "{m}":
            return date.getMinutes();
        case "{s}":
            return date.getSeconds();
        case "{ms_time_stamp}":
            return date.getTime();
        case "{s_time_stamp}":
            return parseInt(date.getTime() / 1000);
        case "{file_name}":
            return filename;
    }
}
