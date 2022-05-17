import scrape from 'website-scraper';
import PuppeteerPlugin from 'website-scraper-puppeteer';
import express from 'express';
import archiver from 'archiver';
import * as fs from 'fs';
import { doesNotMatch } from 'assert';

const app = express();
const port =  process.env.PORT || 3000;
function isUrl(s) {
    var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
    return regexp.test(s);
 }
 /**
 * @param {String} sourceDir: /some/folder/to/compress
 * @param {String} outPath: /path/to/created.zip
 * @returns {Promise}
 */
function zipDirectory(sourceDir, outPath) {
  const archive = archiver('zip', { zlib: { level: 9 }});
  const stream = fs.createWriteStream(outPath);

  return new Promise((resolve, reject) => {
    archive
      .directory(sourceDir, false)
      .on('error', err => reject(err))
      .pipe(stream)
    ;

    stream.on('close', () => resolve());
    archive.finalize();
  });
}
app.get('/', (req, res) => {
    if(req.query.url){
        var reqUrl = req.query.url.replace(/(http|https):\/\//,"");
        var url = isUrl("http://"+reqUrl);
        var url = url ? "http://"+reqUrl : false;
        const now = Date.now();
        const dir = `files/${now}/${reqUrl}`;
        const zipUri = `${dir}/archive`;
        const domain =  req.protocol+"://"+req.get('host');
        if(url) {
            fs.mkdir("./"+dir, { recursive: true }, (error) => {
                if (error) {
                console.log(error);
                }
            });
            scrape({
                urls: [url],
                directory: `${dir}/raw`,
                request: {
                    headers: {
                    'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.4859.164 Safari/537.36"
                    }
                },
                plugins: [
                    new PuppeteerPlugin({
                        launchOptions: { 
                            headless: true, 
                            defaultViewport: {
                                "width":1920,
                                "height":1080
                            },
                            args: [
                                '--no-sandbox',
                                '--disable-setuid-sandbox',
                              ],
                        },
                        scrollToBottom: { timeout: 10000, viewportN: 10 },
                        blockNavigation: true /* optional */
                    })
                ]
            }).then(()=>{
                fs.mkdir(zipUri, { recursive: true }, (error) => {
                    if (error) {
                    console.log(error);
                    }
                });
                zipDirectory(`${dir}/raw`,`./${zipUri}/archive.zip`);
                var data = {
                    "rawFiles":`${domain}/${dir}/raw`,
                    "zip": `${domain}/${zipUri}/archive.zip`
                };
                var error = false
                var response = {
                    "data":data,
                    "status": (data) ? "success" : "error has occured, check your request parameters.",
                    "error": error ?? true
                }
                res.send(response);
            });
        } else {
            var response = {
                "data":data,
                "status": (data) ? "success" : "error has occured, check your request parameters.",
                "error": error ?? true
            }
            res.send(response);
        }
} else {
    var response = {
        "data": null,
        "status": "error has occured, check your request parameters.",
        "error": true
    }
    res.send(response);
}
})

app.use('/files',express.static('./files'));
app.listen(port, () => {
  console.log(`App listening on port ${port}`)
})