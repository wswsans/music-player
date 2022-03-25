"use strict";
console.log("scriptV1.js Loaded!");
console.log((window.navigator.onLine) ? "Online" : "Offline");

const player = new Audio();
var AudioContext = window.AudioContext || window.webkitAudioContext;

const isJapanese = (((window.navigator.languages && window.navigator.languages[0]) ||
                      window.navigator.language ||
                      window.navigator.userLanguage ||
                      window.navigator.browserLanguage).substr(0, 2) == 'ja');
const dialog = isJapanese ? "div#dialog" : "div#dialog-en";

let data = null;
let started = false;
let paused = false; // player.pausedがあるが, button#startで強制的にpausedをはずさないといけないが, 外せないのでオリジナルを作ることにしている
let count = 0;
let waiting = false;
let duration = 0;
let cTime = 0;
let resetting = false;
let wholeLoop = true;
let header_ct = 0;
// リップシンク用の変数達
let context = null;
let source = null;
let analyser = null;
let prevSpec = 0;
let lipSyncInterval = null;
// 逆再生
let rev_context = null;
let rev_source = null;
let gainNode = null;
let Mbuffers = [];
let rev_started = false;
let timeLog = 0;
let minus = 0;
// ストリーミング
let isStreaming = false;
let urls = null;

player.preload = "metadata";

// PWA
if ('serviceWorker' in navigator && window.location.hostname != "localhost") {
	// より限定的なスコープを使用して、
	// サイトのルートでホストされるサービスワーカーを登録します。
	navigator.serviceWorker.register('/music-player/sw.js', {scope: '/music-player/'}).then(function(registration) {
		console.log('Success:\n', registration);
		registration.onupdatefound = function() {
			console.log('アップデートがあります！');
			registration.update();
		}
	}, /*catch*/ function(error) {
		console.log('Failed:\n', error);
	});
} else {
	console.log('Service worker is Not supported');
};
const CatchReset = () => {
	navigator.serviceWorker.getRegistration().then(registration => {
		registration.unregister();
	})
}

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
	let imgName = "mouth_close.png";
	if (totalSpectrum > prevSpec) {
		imgName = "mouth_open.png";
	} else if (prevSpec - totalSpectrum < 500 && prevSpec - totalSpectrum > 0) {
		imgName = "mouth_open_light.png";
	}
	$("img#mouth").attr("src", `./image/${imgName}`);
	prevSpec = totalSpectrum;
};
// 逆再生
const MReverser = (ct, start_time) => { // start_time: 逆再生ver
	rev_started = false;
	if (rev_source) rev_source.onended();
	if (paused || !started || resetting) return;
	timeLog = 0;
	rev_source = rev_context.createBufferSource();
	rev_source.buffer = Mbuffers[ct];
	rev_source.playbackRate.value = 1;
	rev_source.onended = () => {
		try {
			rev_source.stop(0);
			rev_started = false;
		} catch (e) { };
	};
	gainNode = rev_context.createGain();
	rev_source.connect(gainNode);
	gainNode.connect(rev_context.destination);
	gainNode.gain.value = parseFloat($("input.volume.range").val());
	let tmp = start_time -0.01;
	if (tmp <= 0) tmp = 0;
	setTimeout(() => {
		rev_source.start(0, tmp);
		rev_started = true;
	}, 10);
};
const start = (ct) => {
	if (waiting) return;
	waiting = true;
	setTimeout(() => waiting = false, 300);
	if(!context) {
		webAudioSetup();
		lipSyncInterval = setInterval(() => {
			let spectrums = new Uint8Array(analyser.fftSize);
			analyser.getByteFrequencyData(spectrums);
			syncLip(spectrums);
		}, 100);
	};
	// ロードより先にやっておきたいと
	count = ct;
	$("li").css("border", "1px dotted #000").removeClass("playing")
			.filter(`[value=${ct +1}]`).css("border", "thick double #000").addClass("playing");
	// ロード
	cTime = player.currentTime = 0;
	let tmp = () => {
		started = true;
		if (!paused) player.play();
		$("div.loader").hide();
		$("div#switch img").show();
		if ($("img#switch_img").hasClass("album_art")) $("img#mouth").hide();
	}
	if (isStreaming) {
		player.crossOrigin = 'anonymous';
		player.src = urls[ct];
		tmp();
	} else if ($("li.playing").prop("MData")) {
		player.src = $("li.playing").prop("MData");
		tmp();
	} else {
		const fReader = new FileReader();
		fReader.readAsDataURL(data[ct]);
		fReader.onloadend = (event) => {
			$("li.playing").prop("MData", event.target.result);
			player.src = event.target.result;
			tmp();
		};
	};
	// 逆再生用
	$("button#MReverse").addClass("btn_on").click();
	if (!rev_context) rev_context = new AudioContext();
	if (!isStreaming && !Mbuffers[ct]) {
		const fReader = new FileReader();
		fReader.readAsArrayBuffer(data[ct]);
		fReader.onloadend = (event) => {
			rev_context.decodeAudioData(event.target.result, (b) => {
				let buffer = b;
				for (let i=0;i<buffer.numberOfChannels;i++) buffer.getChannelData(i).reverse();
				Mbuffers[ct] = buffer;
			});
		};
	};
	// ロードが終わったらやりたいもの
	setTitle(`▷ ${$("li.playing").text()}`);
	$("input#list_track").val(ct +1);
	// ファイルデータ
	let MediaTagWaiting = () => setTimeout(() => {
		if ($("li.playing").prop("Ready")) {
			$("img#switch_img").prop("artdata", $("li.playing").prop("artdata")).click().click();
			$("span#description").html(`
				Title: ${$("li.playing").prop("MTitle")}<br>
				Artist: ${$("li.playing").prop("MArtist")}<br>
				Album: ${$("li.playing").prop("MAlbum")}<br>
				Year: ${$("li.playing").prop("MYear")}<br>
				Comment: ${$("li.playing").prop("MComment")}<br>
				Track: ${$("li.playing").prop("MTrack")}<br>
				Genre: ${$("li.playing").prop("MGenre")}<br>
			`);
			$("span#lyrics").html(`Lyrics: <br>${$("li.playing").prop("MLyrics")}<br>`);
		} else MediaTagWaiting();
	}, 1);
	MediaTagWaiting();
	Notification.requestPermission().then((result) => {
		if (result === 'granted' && $("button#notification").hasClass("btn_on") && !document.hasFocus()) {
			setTimeout(() => {
				Push.create($("li.playing").text(), {
					body: "Play",
					icon: $("img#switch_img").prop("artdata"),
					timeout: 5000,
					onClick: function () {
						window.focus();
						this.close();
					}
				})
			}, 50);
		};
	});
};
const looper = (num) => {
	if (num == header_ct) {
		if ($("header span").width() > $(window).width()) {
			$("header span").animate({"marginLeft": `-=${$("header span").width() - window.innerWidth +20}`}, 5000, "linear").fadeOut(500)
							.css("marginLeft", "10px").fadeIn(500, () => looper(num));
		} else {
			$("header span").stop(true, true).css("marginLeft", "10px").fadeIn(1);
			setTimeout(() => looper(num), 500);
		}
	}
}
const setTitle = (name) => {
	document.title = name;
	$("header span").text( ($("li.playing").text()) ? $("li.playing").text() : "Music Player" );
	header_ct++;
	looper(header_ct);
}
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
	};
};
// ソート
const sortPlayList = () => {
	let tmp = $("ol#music_list").children().get()
	tmp.sort(function (a, b) {
		let nameA = $(a).prop( $("select.sort.selector").val() )
		let nameB = $(b).prop( $("select.sort.selector").val() )
		switch ($("select.sort.selector").val()) {
			// 文字
			case "MName":
			case "MTitle":
			case "MArtist":
			case "MAlbum":
			case "MComment":
			case "MGenre":
			case "MLyrics":
				nameA = String(nameA).toLowerCase();
				nameB = String(nameB).toLowerCase();
				break;
			// 数字
			case "MTrack":
				nameA = String(nameA).replace(/\/(.*)/, "");
				nameB = String(nameB).replace(/\/(.*)/, "");
			case "value":
			case "MYear":
				nameA = parseFloat(nameA);
				nameB = parseFloat(nameB);
				break;
		};
		if (nameA < nameB) { return (($("button#reverse").hasClass("btn_on")) ? 1 : -1) };
		if (nameA > nameB) { return (($("button#reverse").hasClass("btn_on")) ? -1 : 1) };
		return 0;
	});
	// ソート結果
	$("ol#music_list").html("");
	tmp.forEach((val, ind) => $(val).appendTo("ol#music_list").click(e => { if (count != (parseInt($(val).val()) -1) || player.shuffle) start( (parseInt($(val).val()) -1) ) }) );
};

$(() => {
	// ドラッグドロップ
	$("div#drag_drop").on({
		dragover: e => {
			e.stopPropagation();
			e.preventDefault();
			$(e.target).css("background", "#e1e7f0");
		},
		dragleave: e => {
			e.stopPropagation();
			e.preventDefault();
			$(e.target).css("background", "rgba(255, 255, 255, 0)");
		},
		drop: e => {
			e.stopPropagation();
			e.preventDefault();
			$(e.target).css("background", "rgba(255, 255, 255, 0)");
			let tmp = new DataTransfer();
			Object.values(e.originalEvent.dataTransfer.files).forEach(val => {
				if ($("input#play_data").attr("accept").indexOf(val.name.replace(/(.*)\./, ".")) != -1) tmp.items.add(val);
			})
			$("input#play_data").prop("files", tmp.files).change();
		}
	});
	// 定義er
	$("input#play_data").change(e => {
		// リセット
		count = 0;
		started = false;
		waiting = false;
		paused = false;
		isStreaming = false;
		urls = null;
		player.removeAttribute('crossOrigin');
		setTitle("Music Player");
		$("button#reset").click();
		if (rev_started) rev_source.onended(0);
		player.pause();
		$("button#pause").removeClass("btn_on");
		cTime = player.currentTime = 0;
		$("input.range.seek").val(0).trigger("input");
		$("div.loader").show();
		$("div#switch img").hide();
		$("div#main").hide();
		$("ol#music_list").html("");
		if ($(e.target).val()) {
			$("button#start").css("cursor", "pointer").show();
		} else {
			$("button#start").css("cursor", "not-allowed").hide();
		};
		// リストにまとめる
		data = $(e.target).prop("files");
		switch(data[0].type){
			case "audio/mpegurl":
			case "audio/x-mpegurl":
			case "application/x-mpegurl":
				let reader = new FileReader();
				reader.readAsText(data[0]);
				reader.onload = function (e){
					isStreaming = true;
					urls = reader.result.replace(/\r/g, '').split(/\n/g)
										.filter((val) => {return val.length > 0 && val[0] != '#';});  // 空行とコメント(#から始まる)を削除
					let urlsLength = urls.length;
					urls = urls.filter((val) => {return val.startsWith("http");});
					if (urlsLength != urls.length){
						let urlSkipAlert = isJapanese
										  ? "httpおよびhttpsで始まるURLのみに対応しています。\nそれ以外のURLはスキップされます。" 
										  : "Only URLs starting with 'http' or 'https' are supported.\nThe others are skipped.";
						alert(urlSkipAlert);
						urlsLength = urls.length;
					}
					if(urlsLength < 1){
						let noUrlAlert = isJapanese
									   ? "プレイリストにURLがありません。"
									   : "No appropriate URL in the playlist.";
						alert(noUrlAlert);
						$("button#start").css("cursor", "not-allowed").hide();
						return;
					}
					$("input#list_track").prop("max", urlsLength);
					$("ol#music_list").html("");
					urls.forEach((val, i) => {
						$("<li>").appendTo("ol#music_list")
								 .text(val)
								 .prop("MName", val)
								 .val(i + 1)
								 .addClass("showed")
								 .click(e => { if (count != i || player.shuffle) start(i) });
						$(`li[value=${i +1}]`).prop("artdata", "./image/no_image.png");
						$(`li[value=${i +1}]`).prop({MTitle: "", MArtist: "", MAlbum: "", MYear: "", MComment: "", MTrack: "", MGenre: "", MLyrics: "", Ready: true, MData: undefined});
					});
				}
				return;
			default:
		}
		Mbuffers = []
		for (let i = 0; i < data.length; i++) Mbuffers.push(undefined);
		$("input#list_track").prop("max", data.length);
		$("ol#music_list").html("");
		Object.values(data).forEach((val, i) => {
			$("<li>").appendTo("ol#music_list")
					.text(val.name.split(".").slice(0, -1).join("."))
					.prop("MName", val.name.split(".").slice(0, -1).join("."))
					.val(i + 1)
					.addClass("showed")
					.click(e => { if (count != i || player.shuffle) start(i) });
			$(`li[value=${i +1}]`).prop({ MTitle: "", MArtist: "", MAlbum: "", MYear: "", MComment: "", MTrack: "", MGenre: "", MLyrics: "", Ready: false, MData: undefined});
			const mediaTag = window.jsmediatags;
			mediaTag.read(val, {
				onSuccess: function(res) {
					let pic = "";
					let base64String = "";
					pic = res.tags.picture;
					if (pic) {
						base64String = "";
						for (let n = 0; n < pic.data.length; n++) base64String += String.fromCharCode(pic.data[n]);
						$(`li[value=${i +1}]`).prop("artdata", `data:${pic.format};base64,${window.btoa(base64String)}`);
					} else {
						$(`li[value=${i +1}]`).prop("artdata", "./image/no_image.png");
					};
					let tmp = (res.tags.lyrics) ? res.tags.lyrics : "";
					if (typeof tmp == "object") tmp = tmp.lyrics;
					tmp = tmp.replace(/\n|\r/g, "<br>");
					$(`li[value=${i +1}]`).prop({
						MTitle: ((res.tags.title) ? res.tags.title : ""),
						MArtist: ((res.tags.artist) ? res.tags.artist : ""),
						MAlbum: ((res.tags.album) ? res.tags.album : ""),
						MYear: ((res.tags.year) ? res.tags.year : ""),
						MComment: ( (res.tags.comment) ? ((typeof res.tags.comment == "object") ? res.tags.comment.text : res.tags.comment) : "" ),
						MTrack: ((res.tags.track) ? res.tags.track : ""),
						MGenre: ((res.tags.genre) ? res.tags.genre : ""),
						MLyrics: tmp,
						Ready: true
					});
				},
				onError: (error) => {
					console.log(`Num: ${i}, Error\n${error.info}`);
					$(`li[value=${i +1}]`).prop({artdata: "./image/no_image.png", Ready: true});
				}
			});
		});
	});
	$("button#start").click(e => {
		if (waiting) return;
		if (!data.length || $("button#start").css("display") == "none") {
			console.log("Nothing");
			return;
		};
		paused = false;
		start(0);
		if(isStreaming){
			// ストリーミング再生では一部機能を隠蔽
			$('.local-only').hide();
		} else {
			$('.local-only').show();
		}
		$("div#main").show();
		$(e.target).hide();
	});
	$("button#reset").click(e => {
		resetting = true;
		$("*").blur();
		// clickして逆になるので想像と逆の変数設定を
		wholeLoop = false;
		player.loop = false;
		player.shuffle = true;
		PreservesPitch(false);
		player.muted = true;
		$("button#notification, button#showed_only, button#reverse, button#MReverse").addClass("btn_on");
		$("button.on_off").not("button#pause").click();
		$("button#loop").click();
		if (rev_started) rev_source.onended(0);
		// 真ん中
		$("input.range").not(".seek").val(1).trigger("input");
		$("input.time.show").val(5).change();
		// 下
		$("img#switch_img").removeClass("album_art").addClass("face").click();
		$("select.search.selector").val("MName");
		$("input.search.text").val("").trigger("input");
		$("select.sort.selector").val("value").change();
		if (window.navigator.platform.slice(0, 3) == "Win") $("input.volume").val(0.5).trigger("input");
		resetting = false;
	});
	// 曲
	$("button.audio").click(e => {
		if (waiting) return;
		let tmp = {
			tag: "li" + (($("button#showed_only").hasClass("btn_on")) ? ".showed" : ""),
			num: null
		};
		$(tmp.tag).each((ind, val) => { if ($(val).hasClass("playing")) tmp.num = ind });
		switch (e.target.classList[1]) {
			case "next":
				count = $(tmp.tag).get(tmp.num +1);
				if (count == undefined) {
					count = $(tmp.tag).first();
					if(!wholeLoop) $("button#pause").click();
				}
				break;
			case "back":
				count = $(tmp.tag).get(tmp.num -1);
				if (count == undefined) count = $(tmp.tag).last();
				break;
		};
		count = $(count).val() -1
		start(count);
	});
	// ループ
	$("button#loop").click(e => {
		if (wholeLoop) {  // 全曲ループ -> 1曲ループ
			wholeLoop = false;
			player.loop = true;
			$(e.target).text("⟲1");
			$(e.target).addClass("btn_on");
		} else if(player.loop) {  // 1曲ループ -> ループ無し
			wholeLoop = false;
			player.loop = false;
			$(e.target).text("⟲");
			$(e.target).removeClass("btn_on");
		} else {  // ループ無し -> 全曲ループ
			wholeLoop = true;
			player.loop = false;
			$(e.target).text("⟲");
			$(e.target).addClass("btn_on");
		}
	});
	// 一時停止, シャッフル, ピッチ, ミュート
	$("button.on_off").click(e => {
		let yn = null;
		switch (e.target.id) {
			// 特別必要なコードがない
			case "notification":
			case "reverse":
				yn = !$(e.target).hasClass("btn_on");
				break;
			case "pause":
				paused = !paused;
				yn = paused;
				if(!started) break;
				setTitle(`${(paused) ? "| |" : "▷"} ${$("li.playing").text()}`);
				if (paused) {
					if (rev_started) rev_source.onended(0);
					player.pause();
				} else {
					if ($("button#MReverse").hasClass("btn_on")) {
						MReverser(count, duration -cTime);
					} else {
						player.play();
					}
				};
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
				if ($("button#MReverse").hasClass("btn_on")) MReverser(count, duration -cTime);
				yn = !player.muted;
				break;
			case "showed_only":
				yn = !$(e.target).hasClass("btn_on");
				if (yn && !$("li.playing").hasClass("showed")) $("li.showed").get(0).click();
				break;
			case "MReverse":
				yn = !$(e.target).hasClass("btn_on");
				if (!started) break;
				if (yn) {
					if ($("img#switch_img").hasClass("face")) $("img#switch_img").prop("faced", true).click();
					$("button#pitch, .speed, div#switch").css("cursor", "not-allowed").not("div#switch").prop("disabled", true); // 操作禁止
					player.pause();
					MReverser(count, duration -cTime);
				} else {
					$("button#pitch, .speed, div#switch").css("cursor", "pointer") // 操作禁止 解除
											.not("div#switch").prop("disabled", false)
											.filter("input").css("cursor", "text")
											.filter(".range").css("cursor", "ew-resize");
					if ($("img#switch_img").prop("faced")) $("img#switch_img").prop("unlock", true).click().prop({unlock: false, faced: false});
					player.currentTime = cTime;
					if (!paused) player.play();
					if (rev_source) rev_source.onended();
				};
				break;
		};
		if (yn) {
			$(e.target).addClass("btn_on");
		} else {
			$(e.target).removeClass("btn_on");
		}
	});
	$("button#shuffle_btn").click(() => { if (player.shuffle) {
		let tmp = $("li" + (($("button#showed_only").hasClass("btn_on")) ? ".showed" : ""))
		$( tmp.get(Math.floor(Math.random() * tmp.length)) ).click().get(0).scrollIntoView(true)
	}});
	// 速度
	$("input.speed.range").on("input", e => $("input.speed.show")[0].value = player.playbackRate = player.defaultPlaybackRate = parseFloat($(e.target).val()) );
	// 音量
	$("input.volume.range").on("input", e => {
		$("input.volume.show").val(parseFloat($(e.target).val()));
		if ($("button#MReverse").hasClass("btn_on")) MReverser(count, duration -cTime);
		player.volume = ($("input.volume.show").val() >= 1 ) ? 1 : $("input.volume.show").val();
		player.muted = !parseFloat($("input.volume.show").val());
		(!player.muted) ? $("button#mute").addClass("btn_on") : $("button#mute").removeClass("btn_on");
	});
	// 速度, 音量 共通
	$("input.show.similar_num").change(e => {
		let classes = e.target.classList;
		if ($(e.target).val() == "") $(e.target).val(((classes[0] == "seek") ? $("input.range.seek").val() : 1));
		$(`input.${classes[0]}.range`).val($(e.target).val()).trigger("input");
		$(e.target).blur();
	});
	$("button.similar_btn").click(e => {
		let classes = e.target.classList;
		let code = {next: 1, back: -1}[classes[1]];
		if (classes[0] == "time") {
			if ($("button#MReverse").hasClass("btn_on")) {
				cTime += code * $("input.time.show").val();
				if (cTime <= 0) cTime = 0;
				if (duration <= cTime) cTime = duration;
				if (!paused) MReverser(count, duration -cTime);
			} else {
				player.currentTime += code * $("input.time.show").val();
			}
			$(e.target).blur();
		} else { // 時間操作以外(速度, 音量)
			// 先回りしてエラー回避
			if ((parseFloat($(`input.${classes[0]}.range`).val()) +code*0.05) == 0.05 && classes[0] == "speed") $(`input.${classes[0]}.range`).val(0.05);
			$(`input.${classes[0]}.range`).val(parseFloat($(`input.${classes[0]}.range`).val()) + code *{volume: 0.1, speed: 0.05}[classes[0]]).trigger("input");
		};
	});
	// スキップ時間
	$("input.time.show").change(e => {
		$(e.target).val( ($(e.target).val()) ? Math.floor(Math.abs($(e.target).val()) *10) /10 : "5" ).width(`${$(e.target).val() *10}`.length *5 +10).blur();
	});
	// シークバー
	$("input.seek.range").on("input", e => {
		if ($("button#MReverse").hasClass("btn_on")) {
			cTime = $(e.target).val();
			MReverser(count, duration -cTime);
		} else {
			player.currentTime = $(e.target).val();
		};
	});
	// ソート
	$("select.sort.selector").change(sortPlayList);
	$("button#reverse").click(sortPlayList);
	// アルバムアートと顔のスイッチ
	$("div#switch").click(e => {
		if ($("button#MReverse").hasClass("btn_on") && !$(e.target).prop("unlock")) return;
		$("img#switch_img").toggleClass("album_art").toggleClass("face");
		if ($("img#switch_img").hasClass("album_art")) {
			// Art
			$("img#switch_img").prop("src", $("img#switch_img").prop("artdata"));
			$("div#switch").css("textAlign", "center");
			$("img#mouth").hide();
		} else {
			// Face
			$("img#switch_img").prop("src", "./image/face_normal.png");
			$("div#switch").css("textAlign", "left");
			$("img#mouth").show();
		}
	});
	// 曲リスト
	$("input#list_num").change(e => {
		try {
			let tmp = $(`li[value=${$(e.target).val()}]`);
			console.log(tmp)
			if ($("button#showed_only").hasClass("btn_on")) {
				if (tmp.hasClass("showed")) {
					tmp.click();
				} else {
					throw new Error();
				}
			} else {
				tmp.click();
			}
		} catch (e) { } finally {
			$(e.target).val(count +1);
			$(e.target).blur();
		}
	});
	// 検索
	$("select.search.selector").change(e => $("input.search.text").trigger("input") );
	$("input.search.text").on("input", e => {
		if ($(e.target).val() == "") {
			$("ol#music_list li").show().addClass("showed");
		} else {
			$("ol#music_list li").hide().removeClass("showed").each((ind, val) => {
				if (($(val).prop($("select.search.selector").val()).toLowerCase()).indexOf($(e.target).val().toLowerCase()) != -1) $(val).show().addClass("showed");
			})
		};
		if (started && $("button#showed_only").hasClass("btn_on") && !$("li.playing").hasClass("showed") && $("li.showed").length > 0) $("li.showed").get(0).click();
	}).change(e => $(e.target).blur() );
	// 時間操作系
	window.setInterval(() => {
		// スタート関係なしに動く
		$("section#selector, div#main").width(window.innerWidth -15);
		if (!started) return;
		// 0.1秒の観測
		if (rev_started && rev_context.currentTime - timeLog >= 0.1) {
			minus = 0.1;
			timeLog = Math.floor(rev_context.currentTime *10) /10;
		} else {
			minus = 0;
		};
		// currentTime
		if ($("button#MReverse").hasClass("btn_on")) {
			if (!paused) cTime -= minus;
		} else {
			cTime = Math.floor(player.currentTime *10) /10;
		}
		// 逆再生 - ループ
		if ($("button#MReverse").hasClass("btn_on") && cTime <= 0 && player.loop && !paused) {
			MReverser(count, 0);
			cTime = duration;
		}
		// サイズ変更
		$("button.time.next").css("marginRight", 200 -$("input.time.show").width());
		$("ol#music_list").height(window.innerHeight -440);
		if (!player.duration) return;
		// durationが必要
		duration = Math.floor(player.duration *10) /10;
		$("input.seek").prop("max", duration);
		$("input.seek.range").val( cTime );
		$("input.seek.show").width(`${duration *10}`.length *10);
		if (document.activeElement.className != "seek show") $("input.seek.show").val(`${$("input.seek").val()}`);
		if ($("span#duration").text() != `/ ${duration}`) $("span#duration").text(`/ ${duration}`);
	}, 1);
	// 曲終了
	$(player).on({
		play: () => $("button#pause").removeClass("btn_on"),
		paused: () => $("button#pause").addClass("btn_on"),
		ended: () => {
			if (!player.loop) {
				if (player.shuffle){
					$("button#shuffle_btn").click();
				} else {
					$("button.audio.next").click();
				};
			}
		},
	});
	// 馬鹿みたいに長いショートカット
	$("html").on("keydown", (event) => {
		// 本職
		if (
			((event.metaKey || event.ctrlKey) && event.code != "Slash") || // (cmd/ctrl) が "/"以外
			(!started && ["Slash", "Escape", "KeyC", "Space"].indexOf(event.code) == -1) || // 始まってない (/, ESC, C, " " 以外)
			(document.activeElement.type == "text") || // focus = text
			(document.activeElement.nodeName == "INPUT" && ["Arrow", "Digit"].indexOf(event.code.slice(0, 5)) != -1) || // focus = number (Arrow, Digit の時)
			(!event.shiftKey && ["Comma", "Period"].indexOf(event.code) != -1) || // shiftじゃない (,, . の時)
			($("button#MReverse").hasClass("btn_on") && ["Comma", "Period", "KeyP", "KeyI"].indexOf(event.code) != -1) || // Reverse (<, >, P, I の時)
			false
		) return;
		switch (event.code) {
			case "Slash":
				$("div#shadow, " + dialog).stop().fadeToggle(100);
				break;
			case "Escape":
				$("div#shadow, " + dialog).stop().fadeOut(100)
				break;
			case "KeyC":
				$("input#play_data").click();
				break;
			case "Space":
				if (event.preventDefault) event.preventDefault();
				event.returnValue = false;
				if (started) {
					$("button#pause").click();
				} else {
					if ($("input#play_data")[0].files.length && $("button#start").css("display") != "none") {
						$("button#start").click();
					} else {
						$("input#play_data").click();
					};
				};
				break;
			case "KeyN":
				$("button#notification").click();
				break;
			case "KeyR":
				if (event.shiftKey) {
					$("button#reset").click();
				} else {
					$("button#reverse").click();
				}
				break;
			case "KeyA":
				$("button.audio.back").click();
				break;
			case "KeyD":
				$("button.audio.next").click();
				break;
			case "KeyL":
				$("button#loop").click();
				break;
			case "KeyS":
				if (event.shiftKey) {
					$("button#shuffle_btn").click();
				} else {
					$("button#shuffle").click();
				}
				break;
			case "Comma":
				$("button.speed.back").click();
				break;
			case "Period":
				$("button.speed.next").click();
				break;
			case "KeyP":
				$("button#pitch").click();
				break;
			case "ArrowUp":
				$("button.volume.next").click();
				break;
			case "ArrowDown":
				$("button.volume.back").click();
				break;
			case "KeyM":
				$("button#mute").click();
				break;
			case "ArrowLeft":
				$("button.time.back").click();
				break;
			case "ArrowRight":
				$("button.time.next").click();
				break;
			case "KeyW":
				$("button#MReverse").click();
				break;
			case "KeyI":
				$("div#switch").click();
				break;
			case "KeyO":
				$("button#showed_only").click();
			case "KeyF":
				$(`li.playing`).get(0).scrollIntoView(true);
				break;
		};
		if (event.code.slice(0, -1) == "Digit") {
			if (event.shiftKey) {
				let num = parseInt(event.code.slice(-1)) -1;
				if (num >= 0){
					let tmp = "li" + (($("button#showed_only").hasClass("btn_on")) ? ".showed" : "")
					if (!$(tmp).get(num)) return;
					$(tmp).get(num).click();
				} else {
					$("li").slice(-1).click();
				};
			} else {
				cTime = duration *(parseInt(event.code.slice(-1))/10);
				if ($("button#MReverse").hasClass("btn_on")) {
					if (!paused) MReverser(count, duration -cTime);
				} else {
					player.currentTime = cTime;
				};
			};
		};
	});
	// 定義し終わったらやるタイプのものたち, data.changeでリセットするならあっちで
	let landscapeAlert = isJapanese
                       ? "横画面の方が操作しやすいです"
                       : "Are you currently using a smartphone or tablet?\nThis app is recommended to be used in landscape mode.";
	if (window.innerHeight > window.innerWidth) window.alert(landscapeAlert);
	$("*").not("input[type=number], input[type=text]").focus(e => $(e.target).blur());
	// ダイアログ
	$("div#shadow").click(() => {$("div#shadow").stop().fadeToggle(100); $(dialog).stop().fadeToggle(100)});
});
