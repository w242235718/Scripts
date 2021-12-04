//错误信息
var merge={}

function tool() {
    //初始化变量
    const start = Date.now()

    //环境判断
    const isSurge = typeof $httpClient != "undefined";
    const isQuanX = typeof $task != "undefined";
    const isNode = typeof require == "function";
    const NodeSet = 'CookieSet.json'
    //结果
    // console.log(isSurge)
    // console.log(isQuanX)
    // console.log(isNode)

    // (function(){})() 立即执行函数
    const node = (() => {
        if (isNode) {
            //引入request模块   request模块?
            const request = require('request');
            const fs = require('fs');
            return {
                request,
                fs
            }
        } else {
            return null;
        }
    })()


    /**
   * 提示信息
   * @param {string} title 标题
   * @param {string} subtitle 副标题
   * @param {string} message 提示信息
   * @param {*} rawopts 设置
   */
    const notify = (title, subtitle, message, rawopts) => {
        // rawopts {'':''} 格式
        const Opts = (rawopts) => {
            //Modified from https://github.com/chavyleung/scripts/blob/master/Env.js

            //rawopts不存在就 undefined 
            if (!rawopts) return rawopts;
            switch (typeof rawopts) {
                //判断rawopts类型
                case "string":
                    return isLoon
                        ? rawopts
                        : isQuanX
                            ? {
                                "open-url": rawopts,
                            }
                            : isSurge
                                ? {
                                    url: rawopts,
                                }
                                : undefined;
                //对象类型
                case "object":
                    if (isLoon) {
                        let openUrl = rawopts.openUrl || rawopts.url || rawopts["open-url"];
                        let mediaUrl = rawopts.mediaUrl || rawopts["media-url"];
                        return {
                            openUrl,
                            mediaUrl,
                        };
                    } else if (isQuanX) {
                        let openUrl = rawopts["open-url"] || rawopts.url || rawopts.openUrl;
                        let mediaUrl = rawopts["media-url"] || rawopts.mediaUrl;
                        return {
                            "open-url": openUrl,
                            "media-url": mediaUrl,
                        };
                    } else if (isSurge) {
                        let openUrl = rawopts.url || rawopts.openUrl || rawopts["open-url"];
                        return {
                            url: openUrl,
                        };
                    }
                    break;
                default:
                    return undefined;
            }
        };

        //nodejs 打印信息
        console.log(`${title}\n${subtitle}\n${message}`);

        //调用 QuanX/Surge/Jsbox 模块推送消息
        if (isQuanX) $notify(title, subtitle, message, Opts(rawopts));
        if (isSurge) $notification.post(title, subtitle, message, Opts(rawopts));
    };


    // 将获得的cookies信息储存起来
    const write = (value, key) => {
        if (isQuanX) return $prefs.setValueForKey(value, key);
        if (isSurge) return $persistentStore.write(value, key);

        //存储实现
        if (isNode) {
            try {
                //fs模块
                //existSync(fileName) 以同步方法检测目录/文件是否存在
                // 存在 true 不存在 false
                //writeFileSync(fileName,data)写入内容到文件 
                if (!node.fs.existsSync(NodeSet)) node.fs.writeFileSync(NodeSet, JSON.stringify({})); //若文件不存在,则以同步形式创建 CookieSet.json 文件
                const dataValue = JSON.parse(node.fs.readFileSync(NodeSet)); // 读取文件 并解析为dataValue对象
                if (value) dataValue[key] = value; //key存在 键值对存储
                if (!value) delete dataValue[key]; //key不存在 删除dataValue中的key
                return node.fs.writeFileSync(NodeSet, JSON.stringify(dataValue)); //将数据持久化到 CookieSet.json 文件中
            } catch (er) {
                return AnError("Node.js持久化写入", null, er);
            }
        }
    };

    // 将获取的cookies信息读出来
    const read = (key) => {
        if (isQuanX) return $prefs.valueForKey(key);
        if (isSurge) return $persistentStore.read(key);
        //实现
        if (isNode) {
            try {
                //判断cookieSet.json是否存在
                if (!node.fs.existsSync(NodeSet)) return null;
                //存在就转成dataValue对象
                const dataValue = JSON.parse(node.fs.readFileSync(NodeSet));
                //获取指定key
                return dataValue[key];
            } catch (er) {
                return AnError("Node.js持久化读取", null, er);
            }
        }
    };

    //适配响应头状态 为了后面调用方便判断？
    const adapterStatus = (response) => {
        console.log(response)

        if (response) {
            //status存在  创建并赋制给statusCode
            //statusCode存在 创建并赋制给status
            if (response.status) {
                response["statusCode"] = response.status;
            } else if (response.statusCode) {
                response["status"] = response.statusCode;
            }
        }
        return response;
    };


    /**
     * get请求
     * @param {Object} options 请求封装 
     * @param {Function} callback 回调函数 
     */
    const get = (options, callback) => {
        //设置浏览器标识
        options.headers["User-Agent"] = "JD4iPhone/167169 (iPhone; iOS 13.4.1; Scale/3.00)";

        //圈x发送get
        if (isQuanX) {
            if (typeof options == "string") options = {
                url: options
            };
            options["method"] = "GET";
            //options["opts"] = {
            //  "hints": false
            //}
            $task.fetch(options).then(response => {
                callback(null, adapterStatus(response), response.body);
            }, reason => callback(reason.error, null, null));
        }

        //surge发送get
        if (isSurge) {
            options.headers["X-Surge-Skip-Scripting"] = false;
            $httpClient.get(options, (error, response, body) => {
                callback(error, adapterStatus(response), body);
            });
        }
        //nodejs发送get
        if (isNode) {
            node.request(options, (error, response, body) => {
                //回调
                callback(error, adapterStatus(response), body);
            });
        }

        // if (isJSBox) {
        //     if (typeof options == "string") options = {
        //         url: options
        //     };
        //     options["header"] = options["headers"];
        //     options["handler"] = function (resp) {
        //         let error = resp.error;
        //         if (error) error = JSON.stringify(resp.error);
        //         let body = resp.data;
        //         if (typeof body == "object") body = JSON.stringify(resp.data);
        //         callback(error, adapterStatus(resp.response), body);
        //     };
        //     $http.get(options);
        // }
    };


    /**
     * post请求
     * @param {Object} options 请求封装 
     * @param {Function} callback 回调
     */
    const post = (options, callback) => {
        //浏览器标识
        options.headers["User-Agent"] = "JD4iPhone/167169 (iPhone; iOS 13.4.1; Scale/3.00)";
        //请求体中有数据,将请求设置为表单提交
        if (options.body) options.headers["Content-Type"] = "application/x-www-form-urlencoded";

        //圈X
        if (isQuanX) {
            if (typeof options == "string") options = {
                url: options
            };
            options["method"] = "POST";
            $task.fetch(options).then(response => {
                callback(null, adapterStatus(response), response.body);
            }, reason => callback(reason.error, null, null));
        }

        //Surge
        if (isSurge) {
            options.headers["X-Surge-Skip-Scripting"] = false;
            $httpClient.post(options, (error, response, body) => {
                callback(error, adapterStatus(response), body);
            });
        }
        //Nodejs
        if (isNode) {
            //发送Post请求
            node.request.post(options, (error, response, body) => {
                callback(error, adapterStatus(response), body);
            });
        }
        // if (isJSBox) {
        //     if (typeof options == "string") options = {
        //         url: options
        //     };
        //     options["header"] = options["headers"];
        //     options["handler"] = function (resp) {
        //         let error = resp.error;
        //         if (error) error = JSON.stringify(resp.error);
        //         let body = resp.data;
        //         if (typeof body == "object") body = JSON.stringify(resp.data);
        //         callback(error, adapterStatus(resp.response), body);
        //     };
        //     $http.post(options);
        // }
    };

    // 异常信息
    const AnError = (name, keyname, er, resp, body) => {
        if (typeof (merge) != "undefined" && keyname) {
            //notify不存在
            if (!merge[keyname].notify) {
                merge[keyname].notify = `${name}: 异常, 已输出日志 ‼️`;
            } else {
                //notify存在,换行记录错误日志
                merge[keyname].notify += `\n${name}: 异常, 已输出日志 ‼️ (2)`;
            }
            merge[keyname].error = 1;
        }
        return console.log(`\n‼️${name}发生错误\n‼️名称: ${er.name}\n‼️描述: ${er.message}${JSON.stringify(er).match(/"line"/) ? `\n‼️行列: ${JSON.stringify(er)}` : ``}${resp && resp.status ? `\n‼️状态: ${resp.status}` : ``}${body ? `\n‼️响应: ${resp && resp.status != 503 ? body : `Omit.`}` : ``}`);
    };

    // 总共用时
    const time = () => {
        const end = ((Date.now() - start) / 1000).toFixed(2);
        return console.log("\n签到用时: " + end + " 秒");
    };

    // 圈x和Surge 关闭请求
    const done = (value = {}) => {
        if (isQuanX) return $done(value);
        if (isSurge) isRequest ? $done(value) : $done();
    };

    return {
        notify,
        write,
        read,
        adapterStatus,
        get,
        post,
        AnError,
        time,
        done,
    }
}

