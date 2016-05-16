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

readDir(STREMIO_CACHE_FOLDER)
  .then(items => items.map(item => stat(path.join(STREMIO_CACHE_FOLDER, item, `${item}.torrent`))
    .then(stats => _.assign({ name: item, folder: path.join(STREMIO_CACHE_FOLDER, item), location: path.join(STREMIO_CACHE_FOLDER, item, `${item}.torrent`) }, stats))
    .catch(err => (err.code === 'ENOTDIR' || err.code === 'ENOENT' ? null : Promise.reject(err)))
  ))
  .then(promises => Promise.all(promises).filter(result => !!result))
  .then(torrents => torrents.map(torrent => readTorrent(torrent.location)
    .then(stats => _.assign({ files: stats.files }, torrent))
  ))
  .then(promises => Promise.all(promises))
  .then(torrents => torrents.map(torrent => Promise.resolve(torrent)
    .then(torrentInfo => torrentInfo.files.map((file, index) => stat(path.join(torrentInfo.folder, `${index}`))
      .then(stats => _.assign({ name: `${index}` }, stats))
      .catch(() => null)
    ))
    .then(promises => Promise.all(promises).filter(result => !!result))
    .then(fileStats => _.assign({ fileStats }, torrent))
  ))
  .then(promises => Promise.all(promises))
  .filter(torrent => torrent.fileStats[0].size === torrent.files[0].length)
  // .each(torrent => console.log(`${}`))
  .map(torrent => ({
    source: path.join(torrent.folder, torrent.fileStats[0].name),
    destination: path.join(DESTINATION_FOLDER, path.basename(torrent.files[0].path))
  }))
  .map(copyAction => copy(copyAction.source, copyAction.destination, { replace: true }))
  .then(promises => Promise.all(promises))
;
