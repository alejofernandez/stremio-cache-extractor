const Promise = require('bluebird');
const fs = require('fs.extra');
const _ = require('lodash');
const readTorrentOriginal = require('read-torrent');
const path = require('path');

const readDir = Promise.promisify(fs.readdir);
const stat = Promise.promisify(fs.stat);
const copy = Promise.promisify(fs.copy);
const readTorrent = Promise.promisify(readTorrentOriginal);

const STREMIO_CACHE_FOLDER = path.join(process.env.HOME, 'Library', 'Application Support', 'stremio', 'stremio-cache');
const DESTINATION_FOLDER = path.join(process.env.HOME, 'Downloads');

const extractFilesFromCache = () => readDir(STREMIO_CACHE_FOLDER)
  .then(searchTorrents)
  .then(readTorrentInformation)
  .then(searchFullyDownloadedFiles)
  .then(copyToDestination)
  .then(report)
;

const searchTorrents = folders => Promise.resolve()
  .then(() => folders.map(folderName => stat(path.join(STREMIO_CACHE_FOLDER, folderName, `${folderName}.torrent`))
    .then(stats => _.assign({
      name: folderName,
      folder: path.join(STREMIO_CACHE_FOLDER, folderName),
      location: path.join(STREMIO_CACHE_FOLDER, folderName, `${folderName}.torrent`)
    }, stats))
    .catch(err => (err.code === 'ENOTDIR' || err.code === 'ENOENT' ? null : Promise.reject(err)))
  ))
  .then(runAll)
  .filter(notNull)
;

const readTorrentInformation = torrents => Promise.resolve()
  .then(() => torrents.map(torrent => readTorrent(torrent.location)
    .then(stats => _.assign({ files: stats.files }, torrent))
  ))
  .then(runAll)
;

const searchFullyDownloadedFiles = torrents => Promise.resolve()
  .then(() => torrents.map(torrent => Promise.resolve()
    .then(() => torrent.files.map((file, index) => stat(path.join(torrent.folder, `${index}`))
      .then(stats => _.assign({ name: `${index}` }, stats))
      .catch(() => null)
    ))
    .then(promises => Promise.all(promises).filter(result => !!result))
    .then(fileStats => _.assign({ fileStats }, torrent))
  ))
  .then(runAll)
  .filter(fullyDownloaded)
;

const copyToDestination = torrents => Promise.resolve(torrents)
  .map(getSourceAndDestination)
  .map(copyFile)
  .then(runAll)
;

const report = files => files.forEach(file => console.log(`Successfully extracted ${path.basename(file.destination)}`));

const getSourceAndDestination = torrent => ({
  source: path.join(torrent.folder, torrent.fileStats[0].name),
  destination: path.join(DESTINATION_FOLDER, path.basename(torrent.files[0].path))
});

const runAll = promises => Promise.all(promises);

const notNull = value => !!value;

const fullyDownloaded = torrent => torrent.fileStats[0].size === torrent.files[0].length;

const copyFile = file => copy(file.source, file.destination, { replace: true }).thenReturn(file);

extractFilesFromCache();
