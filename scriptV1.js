console.log("scriptV1.js Loaded!");
console.log((window.navigator.onLine) ? "Online" : "Offline");

const player = new Audio();
const fReader = new FileReader();
const mediaTag = window.jsmediatags;

let started = false;
let paused = false; // player.pausedがあるが, button#startで強制的にpausedをはずさないといけないが, 外せないのでオリジナルを作ることにしている
let count = 0;
let waiting = false;
let data = null;
let duration = 0;
// リップシンク用の変数達
let context = null;
let source = null;
let analyser = null;
let prevSpec = 0;
let lipSyncInterval = null;

player.preload = "metadata";

// Web Audio APIの初期化
const webAudioSetup = () => {
	context = new AudioContext();
	analyser = context.createAnalyser();
	analyser.fftSize = 512;
	analyser.connect(context.destination);
	source = context.createMediaElementSource(player);
	source.connect(analyser);
};
// スペクトルをもとにリップシンクを行う
const syncLip = (spectrums) => {
	const totalSpectrum = spectrums.reduce(function(a, x) { return a + x });
	let imgName = "mouse_close.png";
	if (totalSpectrum > prevSpec) {
		imgName = "mouse_open.png";
	} else if (prevSpec - totalSpectrum < 500 && prevSpec - totalSpectrum > 0) {
		imgName = "mouse_open_light.png";
	}
	$("img#mouse").attr("src", `./image/${imgName}`);
	prevSpec = totalSpectrum;
};
fReader.onloadend = (event) => {
	player.src = event.target.result;
	started = true;
	if (!paused) player.play();
};
const start = (ct) => {
	if (waiting) return;
	waiting = true;
	window.setTimeout(() => waiting = false, 300);
	if(!context) {
		webAudioSetup();
		lipSyncInterval = setInterval(() => {
			let spectrums = new Uint8Array(analyser.fftSize);
			analyser.getByteFrequencyData(spectrums);
			syncLip(spectrums);
		}, 100);
	}
	// ロード
	fReader.readAsDataURL(data[ct]);
	// ロードが終わったらやりたいもの
	count = ct;
	$("li").css("border", "1px dotted #000");
	$("li")[ct].style.border = "thick double #000";
	document.title = `▷ ${$("li")[ct].innerText}`;
	$("input#list_track").val(ct +1);
	// ファイルデータ
	$("img#switch_img").prop("artdata", "./image/no_image.png");
	$("span#description").html("Title: <br>Artist: <br>Album: <br>Year: <br>Comment: <br>Track: <br>Genre: <br>");
	$("span#lyrics").html("Lyrics: <br>");
	// if (data[ct].type == "audio/wav") return;
	mediaTag.read(data[ct], {
		onSuccess: function(res) {
			let pic = base64String = "";
			pic = res.tags.picture;
			if (pic) {
				base64String = "";
				for (i = 0; i < pic.data.length; i++) base64String += String.fromCharCode(pic.data[i]);
				$("img#switch_img").prop("artdata", `data:${pic.format};base64,${window.btoa(base64String)}`).click().click();
			} else { $("img#switch_img").click().click() };
			$("span#description").html(`Title: ${(res.tags.title) ? res.tags.title : ""}<br>` +
										`Artist: ${(res.tags.artist) ? res.tags.artist : ""}<br>` +
										`Album: ${(res.tags.album) ? res.tags.album : ""}<br>` +
										`Year: ${(res.tags.year) ? res.tags.year : ""}<br>` +
										`Comment: ${(res.tags.comment && res.tags.comment.text != "0") ? res.tags.comment.text : ""}<br>` +
										`Track: ${(res.tags.track) ? res.tags.track : ""}<br>` +
										`Genre: ${(res.tags.genre) ? res.tags.genre : ""}<br>`);
			$("span#lyrics").html(`Lyrics: ${(res.tags.lyrics) ? ((res.tags.lyrics.lyrics) ? res.tags.lyrics : res.tags.lyrics) : ""}<br>`);
			console.log("Lyricks:", res.tags.lyrics);
		},
		onError: (error) => {
			console.log("Error", error.info);
			$("img#switch_img").click().click();
		}
	});
};
const PreservesPitch = (onOff) => {
	if(player.preservesPitch != undefined) {
		player.preservesPitch = (onOff == undefined) ? player.preservesPitch : onOff;
		return player.preservesPitch;
	} else if(player.mozPreservesPitch != undefined) { // Firefox
		player.mozPreservesPitch = (onOff == undefined) ? player.mozPreservesPitch : onOff;
		return player.mozPreservesPitch;
	} else if(player.webkitPreservesPitch != undefined) { // Safari
		player.webkitPreservesPitch = (onOff == undefined) ? player.webkitPreservesPitch : onOff;
		return player.webkitPreservesPitch;
	} else {
		console.log("preservesPitch is not supported by this browser.");
	}
}

$(() => {
	// 定義er
	$("input#play_data").change((e) => {
		// リセット
		count = 0;
		started = false;
		waiting = false;
		document.title = "Music Player";
		$("button#reset").click();
		player.currentTime = 0;
		$("input.range.seek").val(0).trigger("input");
		player.pause();
		$("button#pause").removeClass("btn_on");
		$("section#player, table#lists").hide();
		// $("switch").toggleClass("switch_on", false);
		if ($(e.target).val()) {
			$("button#start").css("cursor", "pointer").show();
		} else {
			$("button#start").css("cursor", "not-allowed").hide();
		};
		// リストにまとめる
		data = $("input#play_data").prop("files");
		$("input#list_track").prop("max", data.length);
		$("ol#play_list").html("");
		for (let i=0; i<data.length; i++) {
			$("<li>").appendTo("ol#play_list")
					.text(data[i].name.split(".").slice(0, -1).join("."))
					.click(() => { if (count != i) start(i) });
		};
	});
	$("button#start").click((e) => {
		if (waiting) return;
		if (!$("input#play_data")[0].files.length || $("button#start").css("display") == "none") {
			console.log("Nothing");
			return;
		};
		paused = false;
		start(0);
		$("section#player").show();
		$("table#lists").show();
		$(e.target).hide();
	});
	$("button#reset").click((e) => {
		// clickして逆になるので想像と逆の変数設定を
		player.loop = true;
		player.shuffle = true;
		PreservesPitch(false);
		player.muted = true;
		$("button.on_off").slice(1).click();
		$("input.range").slice(0, -1).val(1).trigger("input");
		$("input.time.show").val(5).change();
		$("img#switch_img").removeClass("album_art").addClass("face").click();
		if (window.navigator.platform.slice(0, 3) == "Win") $("input.volume").val(0.5).trigger("input");
	});
	// 曲
	$("button.audio").click((e) => {
		if (waiting) return;
		count += {next: 1, back: -1}[e.target.className.split(" ")[1]]
		if (count < 0) count = data.length -1;
		if (data.length -1 < count) count = 0;
		start(count);
	});
	// 一時停止, ループ, シャッフル, ピッチ, ミュート 
	$("button.on_off").click((e) => {
		let yn = null;
		switch (e.target.id) {
			case "pause":
				if(!started) return;
				(paused) ? player.play() : player.pause();
				document.title = `${(paused) ? "▷" : "| |"} ${$("li")[count].innerText}`;
				yn = !paused
				break;
			case "loop":
				player.loop = !player.loop;
				yn = player.loop;
				break;
			case "shuffle":
				player.shuffle = !player.shuffle;
				yn = player.shuffle;
				break;
			case "pitch":
				PreservesPitch(!PreservesPitch());
				yn = !PreservesPitch();
				break;
			case "mute":
				player.muted = !player.muted;
				$("input.volume").val((player.muted) ? 0 : player.volume);
				yn = !player.muted;
				break;
		};
		(yn) ? $(e.target).addClass("btn_on") : $(e.target).removeClass("btn_on");
	});
	$("button#shuffle_btn").click(() => { if (player.shuffle) $("li")[ Math.floor(Math.random() * (data.length)) ].click() });
	// 速度
	$("input.speed.range").on("input", (e) => $("input.speed.show")[0].value = player.playbackRate = player.defaultPlaybackRate = $(e.target).val());
	// 音量
	$("input.volume.range").on("input", (e) => {
		$("input.volume.show")[0].value = player.volume = ($(e.target).val() + ".0").slice(0, 3);
		player.muted = !player.volume;
		(!player.muted) ? $("button#mute").addClass("btn_on") : $("button#mute").removeClass("btn_on");
	});
	// 速度, 音量 共通
	$("input.show.similar_num").change((e) => {
		if ($(e.target).val() == "") $(e.target).val({speed: 1, volume: 1}[e.target.className.split(" ")[0]]);
		$(`input.${e.target.className.split(" ")[0]}.range`).val($(e.target).val()).trigger("input");
		$(e.target).blur();
	});
	$("button.similar_btn").click((e) => {
		let classes = e.target.className.split(" ");
		let code = {next: 1, back: -1}[classes[1]];
		if (classes[0] == "time") {
			player.currentTime += code * $("input.time.show").val();
			$(e.target).blur();
		} else {
			$(`input.${classes[0]}.range`).val(parseFloat($(`input.${classes[0]}.range`).val()) + code *{volume: 0.1, speed: 0.25}[classes[0]]).trigger("input");
		}
	});
	// スキップ時間
	$("input.time.show").change((e) => $(e.target).val( ($(e.target).val()) ? Math.floor(Math.abs($(e.target).val()) *10) /10 : "5" ).width(`${$("input.time.show").val() *10}`.length *5 +10).blur());
	// シークバー
	$("input.seek.range").on("input", (e) => player.currentTime = $(e.target).val());
	$("input.seek.show").change((e) => { // 上とはわざと分離させる, classNameをまとめた変数がないから長くなって無駄
		if ($(e.target).val() == "") $(e.target).val($("input.range.seek").val());
		player.currentTime = $(e.target).val();
		$(e.target).blur();
	});
	window.setInterval(() => {
		if (!player.duration) return;
		// durationが必要
		duration = Math.floor(player.duration *10) /10;
		$("input.seek").prop("max", duration);
		$("input.seek.show").width(`${duration *10}`.length *10);
		$("input.seek.range").val(Math.floor(player.currentTime *10) /10);
		if (document.activeElement.className != "seek show") $("input.seek.show").val(`${$("input.seek").val()}`);
		$("ol#play_list").height(window.innerHeight -150);
		if ($("span#duration").text() != `/ ${duration}`) $("span#duration").text(`/ ${duration}`);
	}, 10);
	// アルバムアートと顔のスイッチ
	$("div#switch").click((e) => {
		$("img#switch_img").toggleClass("album_art").toggleClass("face");
		if ($("img#switch_img").hasClass("album_art")) {
			$("img#switch_img").prop("src", $("img#switch_img").prop("artdata"));
			$("div#switch").css("textAlign", "center");
			$("img#mouse").hide();
		} else {
			$("img#switch_img").prop("src", "./image/face_normal.png");
			$("div#switch").css("textAlign", "left");
			$("img#mouse").show();
		}
	});
	// 曲リスト
	$("input#list_track").change((e) => {
		if ($(e.target).val() == "") $(e.target).val(count +1);
		if ($(e.target).val() < 0) {
			if (0 < 1 +data.length +parseInt($(e.target).val())) {
				$(e.target).val(1 +data.length +parseInt($(e.target).val()))
			} else {
				$(e.target).val(1)
			}
		} else if ($(e.target).val() == 0) {
			$(e.target).val(1)
		} else if (data.length <= $(e.target).val()) {
			$(e.target).val(data.length);
		}
		$("li")[$(e.target).val() -1].click();
		$(e.target).blur();
	});
	// 曲終了
	$(player).on("ended", () => {
		if (!player.loop) {
			if (player.shuffle) {
				$("li")[ Math.floor(Math.random() * (data.length)) ].click();
			} else {
				$("button.audio.next").click();
			};
		};
	});
	$(player).on("pause", () => (player.ended) ? "" : paused = true);
	$(player).on("play", () => paused = false);
	// 馬鹿みたいに長いショートカット
	$("html").on("keydown", (event) => {
		// 本職
		switch (event.code) {
			case "Slash":
				if (!(event.metaKey || event.ctrlKey)) return;
				$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100);
				break;
			case "Escape":
				$("div#shadow").stop().fadeOut(100); $("div#dialog").stop().fadeOut(100);
				break;
			case "KeyC":
				if (event.metaKey || event.ctrlKey) return;
				$("input#play_data").click();
				break;
			case "Space":
				if (event.preventDefault) event.preventDefault();
				event.returnValue = false;
				if (event.metaKey || event.ctrlKey) return;
				if (started) {
					$("button#pause").click();
				} else {
					if ($("input#play_data")[0].files.length && $("button#start").css("display") != "none") {
						$("button#start").click();
					} else {
						$("input#play_data").click();
					}
				}
				break;
			case "KeyR":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#reset").click();
				break;
			case "KeyA":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button.audio.back").click();
				break;
			case "KeyD":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button.audio.next").click();
				break;
			case "KeyL":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!started) break;
				$("button#loop").click();
				break;
			case "KeyS":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (event.shiftKey) {
					$("button#shuffle_btn").click();
				} else {
					$("button#shuffle").click();
				}
				break;
			case "Comma":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button.speed.back").click();
				break;
			case "Period":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button.speed.next").click();
				break;
			case "KeyP":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#pitch").click();
				break;
			case "ArrowUp":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.volume.next").click();
				break;
			case "ArrowDown":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.volume.back").click();
				break;
			case "KeyM":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#mute").click();
				break;
			case "ArrowLeft":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.time.back").click();
				break;
			case "ArrowRight":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.time.next").click();
				break;
			case "KeyI":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("div#switch").click();
				break;
		};
		if (event.code.slice(0, -1) == "Digit") {
			if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
			if (event.shiftKey) {
				let num = parseInt(event.code.slice(-1)) -1;
				if (num >= 0){
					if (!$("li")[num]) return;
					$("li")[num].click();
				} else {
					$("li").slice(-1).click();
				};
			} else {
				player.currentTime = duration *(parseInt(event.code.slice(-1))/10);
			};
		};
	});
	// 定義し終わったらやるタイプのものたち, data.changeでリセットするならあっちで
	$("input.speed")[0].min = "0";
	if (window.innerHeight > window.innerWidth) alert("横画面の方が操作しやすいです")
	$("*").not("input[type=number]").focus((e) => $(e.target).blur());
	// ダイアログ
	$("div#shadow").click(() => {$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100)});
});
