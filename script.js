(function () {
    const PLAYLISTS = {
        "vip": {
            "url": "http://vip.aersia.net/roster.xml",
            "displayName": "Vidya Interweb Playlist"
        },
        "vip-mellow": {
            "url": "http://vip.aersia.net/roster-mellow.xml",
            "displayName": "VIP Mellow"
        },
        "vip-source": {
            "url": "http://vip.aersia.net/roster-source.xml",
            "displayName": "VIP Source"
        },
        "vip-exiled": {
            "url": "http://vip.aersia.net/roster-exiled.xml",
            "displayName": "VIP Exiled"
        },
        "wap": {
            "url": "http://wap.aersia.net/roster.xml",
            "displayName": "Weeaboo Animu Playlist"
        },
        "cpp": {
            "url": "http://cpp.aersia.net/roster.xml",
            "displayName": "Couch Potato Playlist"
        }
    };


    function parseXmlUrl(url) {

        return fetch(url)
            .then(response => response.text())
            .then(xml => {
                let parser = new DOMParser();
                let dom = parser.parseFromString(xml, "text/xml");
                return dom.documentElement.nodeName == "parsererror" ?
                    Promise.reject("error while parsing") :
                    Promise.resolve(dom);
            });
    }

    function createSong(source, displayName) {
        let artist = "";
        let name = "";
        let url = "";
        if (source instanceof Array) {
            artist = source[0].firstChild.data;
            name = source[1].firstChild.data;
            url = source[2].firstChild.data;
            if (!artist || !name || !url) {
                throw new Error("Malformed data! Extraction failed!")
            }
        } else {
            throw new Error("Malformed data! Input is not an array");
        }
        return {
            "album": displayName,
            artist,
            name,
            url
        };
    }

    function getSongs() {
        let promises = [];
        for (let key in PLAYLISTS) {
            if (PLAYLISTS.hasOwnProperty(key)) {
                let playlist = PLAYLISTS[key];
                let localSongs = [];
                let promise = parseXmlUrl(playlist.url).then(xmlDoc => {
                    try {
                        let trackElements = [].slice.call(xmlDoc.getElementsByTagName("track"), 0);
                        return Promise.resolve(trackElements);
                    } catch (error) {
                        return Promise.reject(error);
                    }

                }).then(elements => {
                    let track = elements.pop();
                    while (track) {
                        let nodes = [track.children[0], track.children[1], track.children[2]];
                        localSongs.push(createSong(nodes, playlist.displayName));
                        track = elements.pop();
                    }
                    console.log("Got " + localSongs.length + " songs from " + playlist.displayName);
                    return Promise.resolve(localSongs);
                }).catch(reason => {
                    console.log("Impossible to parse! ", reason);
                    return Promise.resolve([]);
                });
                promises.push(promise);
            }
        }
        return Promise.all(promises)
            .then(values => Promise.resolve(values.reduce((prev, curr) => prev.concat(curr), [])));
    }

    getSongs().then(songs => {
        console.log("Got songs. Initializing Amplitude...");
        const config = {
            "songs": songs,
            "volume": 0.5,
            "autoplay": true
        };
        console.log("Config", config);
        Amplitude.init(config);
    });
})();