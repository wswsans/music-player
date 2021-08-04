console.log("scriptV1.js Loaded!");
console.log((window.navigator.onLine) ? "Online" : "Offline");

const fReader = new FileReader();
const mediaTag = window.jsmediatags;

let started = false;
let paused = false;
let count = 0;
let vol = 1;
let waiting = false;

fReader.onloadend = (event) => {
	$("audio#audio_player")[0].src = event.target.result;
	if (!paused) $("audio#audio_player")[0].play();
}
const start = (ct) => {
	if (waiting) return;
	waiting = true;
	// 変数設定
	let player = $("audio#audio_player")[0]
	let data = $("input#play_data")[0].files[ct]
	// 初期化
	// $("audio#audio_player")[0].currentTime = 0
	// ロード
	window.setTimeout(() => waiting = false, 200);
	fReader.readAsDataURL(data);
	// 設定(読み込み完了したらやりたいもの)
	seekbar = window.setInterval(() => {
		$("input#seek")[0].max = player.duration;
		$("input#seek")[0].value = Math.floor(player.currentTime *10) /10;
		$("span#seek_show")[0].innerText = `${$("input#seek")[0].value} / ${Math.floor(player.duration *10) /10}`;
	}, 10);
	document.title = `▷ ${data.name}`;
	count = ct;
	$("li").css({"border": "1px dotted #000"});
	$("li")[ct].style.border = "thick double #000";
	started = true;
	// ファイルデータ
	$("img#album_art")[0].src = ""
	$("img#album_art")[0].style.padding = "150px";
	$("span#description")[0].innerText = "Title: \nArtist: \nAlbum: \nYear: \nComment: \nTrack: \nGenre: \n"
	$("span#lyrics")[0].innerText = "Lyrics: \n"
	if (data.type == "audio/wav") return;
	mediaTag.read($("input#play_data")[0].files[ct], {
		onSuccess: function(res) {
			let pic = base64String = "";
			pic = res.tags.picture;
			if (pic) {
				base64String = ""
				for (i = 0; i < pic.data.length; i++) {
					base64String += String.fromCharCode(pic.data[i]);
				}
				$("img#album_art")[0].style.padding = "0px";
				$("img#album_art")[0].src = `data:${pic.format};base64,${window.btoa(base64String)}`;
			}
			$("span#description")[0].innerText = `Title: ${(res.tags.title) ? res.tags.title : ""}\n` +
												`Artist: ${(res.tags.artist) ? res.tags.artist : ""}\n` +
												`Album: ${(res.tags.album) ? res.tags.album : ""}\n` +
												`Year: ${(res.tags.year) ? res.tags.year : ""}\n` +
												`Comment: ${(res.tags.comment && res.tags.comment.text != "0") ? res.tags.comment.text : ""}\n` +
												`Track: ${(res.tags.track) ? res.tags.track : ""}\n` +
												`Genre: ${(res.tags.genre) ? res.tags.genre : ""}\n`;
			$("span#lyrics")[0].innerText = `Lyrics: ${(res.tags.lyrics) ? ((res.tags.lyrics.lyrics) ? res.tags.lyrics : res.tags.lyrics) : ""}\n`;
			console.log("Lyricks:", res.tags.lyrics)
		},
		onError: (error) => console.log("Error", error.info)
	});
}


$(() => {
	// 定義er
	$("input#play_data")[0].onchange = () => {
		// リセット
		count = 0;
		started = false;
		waiting = false;
		document.title = "Music Player";
		$("audio#audio_player")[0].currentTime = 0;
		$("audio#audio_player")[0].pause();
		$("input#loop")[0].checked = false;
		$("input#speed")[0].value = 1; $("input#speed")[0].oninput();
		$("input#volume")[0].value = 1; $("input#volume")[0].oninput();
		$("section#player").css({"display": "none"});
		$("table#lists").css({"display": "none"});
		$("img#album_art")[0].src = ""
		$("img#album_art")[0].style.padding = "150px";
		$("span#description")[0].innerText = "Title: \nArtist: \nAlbum: \nYear: \nComment: \nTrack: \nGenre: \n"
		$("span#lyrics")[0].innerText = "Lyricks: \n"
		// リストにまとめる
		$("ol#play_list")[0].innerHTML = "";
		let li = null
		for (let i=0; i<$("input#play_data")[0].files.length; i++) {
			li = document.createElement("li");
			li.innerText = $("input#play_data")[0].files[i].name.split('.').slice(0, -1).join(".");
			li.onclick = () => { if (count != i) start(i) }
			$("ol#play_list")[0].appendChild(li);
		}
	}
	$("button#start")[0].onclick = () => {
		if (waiting) return;
		if ($("input#play_data")[0].value == "") {
			console.log("Nothing");
			return;
		}
		$("body")[0].click();
		paused = false;
		start(0);
		$("section#player").css({"display": "block"});
		$("table#lists").css({"display": "block"});
	}
	// 再生, 一時停止
	$("button#pause")[0].onclick = () => {
		if (paused) {
			$("audio#audio_player")[0].play();
			document.title = `▷ ${$("input#play_data")[0].files[count].name}`;
			$("button#pause")[0].innerText = "| |";
		} else {
			$("audio#audio_player")[0].pause();
			document.title = `| | ${$("input#play_data")[0].files[count].name}`;
			$("button#pause")[0].innerText = "▷";
		}
	}
	// 次の曲
	$("button#next")[0].onclick = () => {
		if (waiting) return;
		if ($("input#play_data")[0].files.length > 1) {
			// console.log(count, $("input#play_data")[0].files.length);
			if ($("input#play_data")[0].files.length > (count + 1)) {
				count++;
			} else {
				count = 0;
			}
		}
		start(count);
	}
	// 前の曲
	$("button#back")[0].onclick = () => {
		if (waiting) return;
		if ($("input#play_data")[0].files.length > 1) {
			if (count > 0) {
				count--;
			} else {
				count = $("input#play_data")[0].files.length - 1;
			}
		}
		start(count);
	}
	// 5秒次
	$("button#time_next")[0].onclick = () => {
		if ($("audio#audio_player")[0].duration >= $("audio#audio_player")[0].currentTime + 5){
			$("audio#audio_player")[0].currentTime += 5;
		} else {
			$("audio#audio_player")[0].currentTime = $("audio#audio_player")[0].duration;
		}
	}
	// 5秒前
	$("button#time_back")[0].onclick = () => {
		if ($("audio#audio_player")[0].currentTime > 5){
			$("audio#audio_player")[0].currentTime -= 5;
		} else {
			$("audio#audio_player")[0].currentTime = 0;
		}
	}
	// ループ
	$("input#loop")[0].onchange = () => $("audio#audio_player")[0].loop = $("input#loop")[0].checked;
	// 速度
	$("input#speed")[0].oninput = () => $("span#speed_show")[0].innerText =  $("audio#audio_player")[0].playbackRate = $("audio#audio_player")[0].defaultPlaybackRate = $("input#speed")[0].value;
	$("button#speed_next")[0].onclick = () => {
		if (parseFloat($("input#speed")[0].value) +0.25 <= 10){
			$("input#speed")[0].value = parseFloat($("input#speed")[0].value) + 0.25;
		} else {
			$("input#speed")[0].value = 10;
		}
		$("input#speed")[0].oninput();
	}
	$("button#speed_back")[0].onclick = () => {
		if (parseFloat($("input#speed")[0].value) -0.25 >= $("input#speed")[0].min){
			$("input#speed")[0].value = parseFloat($("input#speed")[0].value) - 0.25;
		} else {
			$("input#speed")[0].value = 0;
		}
		$("input#speed")[0].oninput();
	}
	// $("input#speed")[0].onchange = () => { $("audio#audio_player")[0].playbackRate = $("audio#audio_player")[0].defaultPlaybackRate = $("input#speed")[0].value }
	// 音量
	$("input#volume")[0].oninput = () => $("span#volume_show")[0].innerText = $("audio#audio_player")[0].volume = ($("input#volume")[0].value + ".0").slice(0, 3);
	$("button#volume_next")[0].onclick = () => {
		if (parseFloat($("input#volume")[0].value) +0.1 <= 1){
			$("input#volume")[0].value = parseFloat($("input#volume")[0].value) + 0.1;
		} else {
			$("input#volume")[0].value = 1;
		}
		$("input#volume")[0].oninput();
	}
	$("button#volume_back")[0].onclick = () => {
		if (parseFloat($("input#volume")[0].value) -0.1 >= 0){
			$("input#volume")[0].value = parseFloat($("input#volume")[0].value) - 0.1;
		} else {
			$("input#volume")[0].value = 0;
		}
		$("input#volume")[0].oninput();
	}
	$("button#mute")[0].onclick = () => {
		if ($("input#volume")[0].value == 0){
			$("input#volume")[0].value = vol;
			$("input#volume")[0].oninput()
			$("button#mute")[0].innerText = "X"
		} else {
			vol = $("input#volume")[0].value;
			$("input#volume")[0].value = 0
			$("input#volume")[0].oninput()
			$("button#mute")[0].innerText = ")))"
		}
	}
	// $("input#volume")[0].onchange = () => { $("audio#audio_player")[0].volume = $("input#volume")[0].value }
	// シークバー
	$("input#seek")[0].oninput = () => $("audio#audio_player")[0].currentTime = $("input#seek")[0].value;
	// 曲終了
	$("audio#audio_player")[0].onended = () => {
		window.clearInterval(seekbar);
		if (! $("input#loop")[0].checked) {
			if ($("input#shuffle")[0].checked) {
				$("li")[ Math.floor(Math.random() * ($("input#play_data")[0].files.length)) ].onclick();
			} else {
				$("button#next")[0].onclick();
			}
		}
	}
	$("audio#audio_player")[0].onpause = () => (!$("audio#audio_player")[0].ended) ? paused = true : "";
	$("audio#audio_player")[0].onplay = () => paused = false;
	// 馬鹿みたいに長いショートカット
	document.onkeydown = function (event) {
		switch (event.code) {
			case "Slash":
				if (event.metaKey || event.ctrlKey) $("div#shadow")[0].style.display = $("div#dialog")[0].style.display = ($("div#dialog")[0].style.display == "block") ? "none" : "block";
				break;
			case "Escape":
				$("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none";
				break;
			case "KeyC":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("input#play_data")[0].click();
				$("input#play_data")[0].onchange();
			case "Space":
			case "KeyP":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#pause")[0].onclick();
				break;
			case "ArrowLeft":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#time_back")[0].onclick();
				break;
			case "ArrowRight":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#time_next")[0].onclick();
				break;
			case "ArrowUp":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#volume_next")[0].onclick();
				break;
			case "ArrowDown":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#volume_back")[0].onclick();
				break;
			case "KeyM":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#mute")[0].onclick();
				break;
			case "Period":
				if (event.metaKey || event.ctrlKey || !started) break;
				if (!event.shiftKey) break;
				$("button#speed_next")[0].onclick();
				break;
			case "Comma":
				if (event.metaKey || event.ctrlKey || !started) break;
				if (!event.shiftKey) break;
				$("button#speed_back")[0].onclick();
				break;
			case "KeyL":
				if (event.metaKey || event.ctrlKey || !started) break;
				if (!started) break;
				$("input#loop")[0].checked = !$("input#loop")[0].checked;
				$("input#loop")[0].onchange();
				break;
			case "KeyS":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("input#shuffle")[0].checked = !$("input#shuffle")[0].checked;
				break;
			case "KeyD":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#next")[0].onclick();
				break;
			case "KeyA":
				if (event.metaKey || event.ctrlKey || !started) break;
				$("button#back")[0].onclick();
				break;
		}
		if (event.code.slice(0, -1) == "Digit") {
			if (event.metaKey || event.ctrlKey || !started) return;
			if (event.shiftKey) {
				let num = parseInt(event.code.slice(-1)) -1
				if (num >= 0){
					if (!$("li")[num]) return;
					$("li")[num].onclick()
				} else {
					$("li").slice(-1)[0].onclick()
				}
			} else {
				$("audio#audio_player")[0].currentTime = (Math.floor($("audio#audio_player")[0].duration *10) /10) *(parseInt(event.code.slice(-1))/10);
			}
		}
	}
	// 定義し終わったらやるタイプのものたち
	$("input#speed")[0].min = "0";
	if (window.navigator.platform.slice(0, 3) == "Win") {$("input#volume")[0].value = 0.5; $("input#volume")[0].oninput()};
	// focus
	window.setInterval(() => {
		if ($("input#play_data")[0].value) {
			(started) ? $("button#start")[0].blur() : $("button#start")[0].focus();
		} else {
			$("input#play_data")[0].focus();
		}
	}, 10);
	$.each($.merge($("input").slice(1), $("button").slice(1)), function (index, val) { val.onfocus = () => val.blur(); });
	// ダイアログ
	$("div#shadow")[0].onclick = () => $("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none";
	$("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none";

});