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
				return dom.documentElement.nodeName === "parsererror" ?
					Promise.reject("error while parsing") :
					Promise.resolve(dom);
			});
	}

	function createSong(nodes, displayName) {
		let artist = "";
		let name = "";
		let url = "";
		if (nodes instanceof Array) {
			// firstChild is always a text node here
			artist = nodes[0].firstChild.data;
			name = nodes[1].firstChild.data;
			url = nodes[2].firstChild.data;

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
			if (!PLAYLISTS.hasOwnProperty(key)) {
				continue;
			}

			let playlist = PLAYLISTS[key];
			let localSongs = [];
			let promise = parseXmlUrl(playlist.url).then(xmlDoc => {
				return [].slice.call(xmlDoc.getElementsByTagName("track"), 0);
			}).then(elements => {
				let track = elements.pop();
				while (track) {
					let nodes = [track.children[0], track.children[1], track.children[2]];
					localSongs.push(createSong(nodes, playlist.displayName));
					track = elements.pop();
				}
				console.log("Got " + localSongs.length + " songs from " + playlist.displayName);
				return localSongs;
			}).catch(reason => {
				console.log("Impossible to parse! ", reason);
				return [];
			});
			promises.push(promise);
		}
		return Promise.all(promises)
			.then(values => values.reduce((prev, curr) => prev.concat(curr), []));
	}

	function getPlaylists(songs) {
		return songs.reduce((prev, curr, currentIndex) => {
			let jsonKey = curr.album.toLowerCase();
			jsonKey = jsonKey.replace(/\s+/i, "_");
			if (!(jsonKey in prev)) {
				prev[jsonKey] = [];
			}
			prev[jsonKey].push(currentIndex);
			return prev;
		}, {});
	}

	function promiseDOMReady() {
		return new Promise(resolve => {
			if (document.readyState === "complete") return resolve();
			document.addEventListener("DOMContentLoaded", resolve);
		});
	}

	getSongs().then(songs => {
		console.log("Got songs. Initializing Amplitude...");
		let playlists = getPlaylists(songs);
		const config = {
			"songs": songs,
			"volume": 0.5,
			"autoplay": true,
			playlists
		};
		return config;
	}).then(config => {
		promiseDOMReady().then(() => Amplitude.init(config));
	});
})();