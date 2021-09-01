"use strict";
console.log("scriptV1.js Loaded!");
console.log((window.navigator.onLine) ? "Online" : "Offline");

const player = new Audio();
var AudioContext = window.AudioContext || window.webkitAudioContext;

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
// 逆再生
const rev_context = new AudioContext();
const gainNode = rev_context.createGain();
let rev_source = null;
let Mbuffers = [];
let cTime = 0;
let rev_cTime = 0;
let timeLog = 0;
let minus = 0;

player.preload = "metadata";

// PWA
if ('serviceWorker' in navigator && window.location.hostname != "localhost") {
	// より限定的なスコープを使用して、
	// サイトのルートでホストされるサービスワーカーを登録します。
	navigator.serviceWorker.register('/music-player/sw.js', {scope: '/music-player/'}).then(function(registration) {
		console.log('Success:\n', registration);
	}, /*catch*/ function(error) {
		console.log('Failed:\n', error);
	});
} else {
	console.log('Service worker is Not supported');
};
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
const MReverser = (ct, start_time) => { // start_time: 逆再生ver
	if (rev_source) {
		rev_source.stop(0);
		// rev_source = null;
		// MReverser(ct, start_time);
		// return;
	};
	rev_source = rev_context.createBufferSource();
	rev_source.buffer = Mbuffers[ct];
	rev_source.playbackRate.value = 1;
	rev_source.connect(gainNode);
	gainNode.connect(rev_context.destination);
	gainNode.gain.value = parseFloat($("input.volume.range").val());
	rev_source.onended = () => rev_source.stop(0);
	rev_source.start(0, start_time);
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
	if ($("li.playing").prop("MData")) {
		player.src = $("li.playing").prop("MData");
		started = true;
		if (!paused) player.play();
	} else {
		const fReader = new FileReader();
		fReader.readAsDataURL(data[ct]);
		fReader.onloadend = (event) => {
			$("li.playing").prop("MData", event.target.result);
			player.src = event.target.result;
			started = true;
			if (!paused) player.play();
		};
	};
	// 逆再生用
	if (rev_source) rev_source.stop(0);
	if ($("button#MReverse").hasClass("btn_on")) $("button#MReverse").removeClass("btn_on");
	if (!Mbuffers[ct]) {
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
	document.title = `▷ ${$("li.playing").text()}`;
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

$(() => {
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
		document.title = "Music Player";
		$("button#reset").click();
		player.currentTime = 0;
		$("input.range.seek").val(0).trigger("input");
		player.pause();
		$("button#pause").removeClass("btn_on");
		$("section#player, table#lists").hide();
		$("ol#play_list").html("");
		if ($(e.target).val()) {
			$("button#start").css("cursor", "pointer").show();
		} else {
			$("button#start").css("cursor", "not-allowed").hide();
		};
		// リストにまとめる
		data = $(e.target).prop("files");
		for (let i = 0; i < data.length; i++) Mbuffers.push(undefined);
		$("input#list_track").prop("max", data.length);
		$("ol#play_list").html("");
		Object.values(data).forEach((val, i) => {
			$("<li>").appendTo("ol#play_list")
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
		$("section#player").show();
		$("table#lists").show();
		$(e.target).hide();
	});
	$("button#reset").click(e => {
		$("*").blur()
		// clickして逆になるので想像と逆の変数設定を
		player.loop = true;
		player.shuffle = true;
		PreservesPitch(false);
		player.muted = true;
		$("button#notification, button#showed_only, button#reverse, button#MReverse").addClass("btn_on");
		$("button.on_off").not("button#pause").click();
		// 真ん中
		$("input.range").slice(0, -1).val(1).trigger("input");
		$("input.time.show").val(5).change();
		// 下
		$("img#switch_img").removeClass("album_art").addClass("face").click();
		$("select.search.selector").val("MName");
		$("input.search.text").val("").trigger("input");
		$("select.sort.selector").val("value").change();
		if (window.navigator.platform.slice(0, 3) == "Win") $("input.volume").val(0.5).trigger("input");
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
				count = $(tmp.tag).get(tmp.num +1)
				if (count == undefined) count = $(tmp.tag).first();
				break;
			case "back":
				count = $(tmp.tag).get(tmp.num -1)
				if (count == undefined) count = $(tmp.tag).last();
				break;
		};
		count = $(count).val() -1
		start(count);
	});
	// 一時停止, ループ, シャッフル, ピッチ, ミュート 
	$("button.on_off").click(e => {
		let yn = null;
		switch (e.target.id) {
			// 特別必要なコードがない
			case "notification":
			case "reverse":
				yn = !$(e.target).hasClass("btn_on");
				break;
			case "pause":
				if(!started) return;
				paused = !paused;
				document.title = `${(paused) ? "| |" : "▷"} ${$("li.playing").text()}`;
				if (paused) {
					if (rev_source) rev_source.stop(0);
					player.pause();
				} else {
					if ($("button#MReverse").hasClass("btn_on")) MReverser(count, duration -cTime)
					else player.play();
				};
				yn = paused
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
					$("button#pitch, .speed").css("cursor", "not-allowed").prop("disabled", true);
					player.pause();
					if (!paused) MReverser(count, duration -cTime);
				} else {
					$("button#pitch, .speed").css("cursor", "pointer").prop("disabled", false)
											.filter("input").css("cursor", "text")
											.filter(".range").css("cursor", "ew-resize");
					player.currentTime = cTime;
					if (!paused) player.play();
					if (rev_source) rev_source.stop(0);
				};
				break;
		};
		(yn) ? $(e.target).addClass("btn_on") : $(e.target).removeClass("btn_on");
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
		if ($(e.target).val() == "") $(e.target).val({speed: 1, volume: 1}[e.target.classList[0]]);
		$(`input.${e.target.classList[0]}.range`).val($(e.target).val()).trigger("input");
		$(e.target).blur();
	});
	$("button.similar_btn").click(e => {
		let classes = e.target.classList;
		let code = {next: 1, back: -1}[classes[1]];
		if (classes[0] == "time") {
			if ($("button#MReverse").hasClass("btn_on")) {
				cTime += code * $("input.time.show").val();
				MReverser(count, duration -cTime);
			} else {
				player.currentTime += code * $("input.time.show").val();
			}
			$(e.target).blur();
		} else {
			// 先回りしてエラー回避
			if ((parseFloat($(`input.${classes[0]}.range`).val()) +code*0.05) == 0.05 && classes[0] == "speed")
				$(`input.${classes[0]}.range`).val(0.05);
			$(`input.${classes[0]}.range`).val(parseFloat($(`input.${classes[0]}.range`).val()) + code *{volume: 0.1, speed: 0.05}[classes[0]]).trigger("input");
		};
	});
	// スキップ時間
	$("input.time.show").change(e => {
		$(e.target).val( ($(e.target).val()) ? Math.floor(Math.abs($(e.target).val()) *10) /10 : "5" ).width(`${$("input.time.show").val() *10}`.length *5 +10).blur()
	});
	// シークバー
	$("input.seek.range").on("input", e => {
		if ($("button#MReverse").hasClass("btn_on")) {
			cTime = $(e.target).val()
			if (!paused) MReverser(count, duration -cTime);
		} else {
			player.currentTime = $(e.target).val();
		};
	});
	$("input.seek.show").change(e => { // 上とはわざと分離させる, classNameをまとめた変数がないから長くなって無駄
		if ($(e.target).val() == "") $(e.target).val($("input.range.seek").val());
		$("input.seek.range").val($(e.target).val()).trigger("input");
		$(e.target).blur();
	});
	window.setInterval(() => {
		$("span#lyrics").parent().height(window.innerHeight -534);
		$("button.time.next").css("marginRight", 200 -79 -$("input.time.show").width());
		$("ol#play_list").height(window.innerHeight -165);
		if (!started) return;
		// ソート
		let tmp = $("ol#play_list").children().get()
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
		// ソート結果 & リバース
		$("ol#play_list").html("");
		tmp.forEach((val, ind) => $(val).appendTo("ol#play_list").click(e => { if (count != (parseInt($(val).val()) -1) || player.shuffle) start( (parseInt($(val).val()) -1) ) }) );
		if (!player.duration) return;
		// durationが必要
		duration = Math.floor(player.duration *10) /10;
		$("input.seek").prop("max", duration);
		$("input.seek.range").val( cTime );
		$("input.seek.show").width(`${duration *10}`.length *10);
		if (document.activeElement.className != "seek show") $("input.seek.show").val(`${$("input.seek").val()}`);
		if ($("span#duration").text() != `/ ${duration}`) $("span#duration").text(`/ ${duration}`);
	}, 50);
	window.setInterval(() => { // 時間操作系
		if (rev_context.currentTime - timeLog >= 0.1) {
			minus = 0.1;
			timeLog = rev_context.currentTime;
		} else {
			minus = 0;
		};
		if ($("button#MReverse").hasClass("btn_on")) {
			if (!paused) cTime -= minus;
		} else {
			cTime = Math.floor(player.currentTime *10) /10;
		}
		if (player.loop && cTime <= 0) {
			MReverser(count, 0);
			cTime = duration;
		}
	}, 1);
	// アルバムアートと顔のスイッチ
	$("div#switch").click(e => {
		$("img#switch_img").toggleClass("album_art").toggleClass("face");
		if ($("img#switch_img").hasClass("album_art")) {
			$("img#switch_img").prop("src", $("img#switch_img").prop("artdata"));
			$("div#switch").css("textAlign", "center");
			$("img#mouth").hide();
		} else {
			$("img#switch_img").prop("src", "./image/face_normal.png");
			$("div#switch").css("textAlign", "left");
			$("img#mouth").show();
		}
	});
	// 曲リスト
	$("input#list_track").change(e => {
		if ($(e.target).val() == "") $(e.target).val(count +1);
		if ($("li").get($(e.target).val() -1) == undefined) $(e.target).val(1);
		$("li").get($(e.target).val() -1).click();
		$(e.target).blur();
	});
	// 検索
	$("select.search.selector").change(e => $("input.search.text").trigger("input") );
	$("input.search.text").on("input", e => {
		if ($(e.target).val() == "") {
			$("ol#play_list li").show().addClass("showed");
		} else {
			$("ol#play_list li").hide().removeClass("showed").each((ind, val) => {
				if (($(val).prop($("select.search.selector").val()).toLowerCase()).indexOf($(e.target).val().toLowerCase()) != -1) $(val).show().addClass("showed");
			})
		};
		if (started && $("button#showed_only").hasClass("btn_on") && !$("li.playing").hasClass("showed") && $("li.showed").length > 0) $("li.showed").get(0).click();
	}).change(e => $(e.target).blur() );
	// 曲終了
	$(player).on("ended", () => {
		if (!player.loop) {
			if (player.shuffle){
				$("button#shuffle_btn").click()
			} else {
				$("button.audio.next").click();
			};
		};
	});
	// 馬鹿みたいに長いショートカット
	$("html").on("keydown", (event) => {
		// 本職
		if (
			((event.metaKey || event.ctrlKey) && event.code != "Slash") || // (cmd/ctrl) が "/"以外
			(!started && ["Slash", "Escape", "KeyC", "Space"].indexOf(event.code) == -1) || // 始まってない (/, ESC, C, " " 以外)
			(document.activeElement.type == "text") || // focus = text
			(document.activeElement.nodeName == "INPUT" && ["Arrow", "Digit"].indexOf(event.code.slice(0, 5)) != -1) || // focus = number (Arrow, Digit の時)
			(!event.shiftKey && ["Comma", "Period"].indexOf(event.code) != -1) // shiftじゃない (,, . の時)
		) return;
		switch (event.code) {
			case "Slash":
				$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100);
				break;
			case "Escape":
				$("div#shadow").stop().fadeOut(100); $("div#dialog").stop().fadeOut(100);
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
				if (event.shiftKey) $("button#reset").click()
				else $("button#reverse").click();
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
				if (event.shiftKey) $("button#shuffle_btn").click()
				else $("button#shuffle").click();
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
					if (!$(`li[value=${num +1}]`)) return;
					$(`li[value=${num +1}]`).click();
				} else {
					$("li").slice(-1).click();
				};
			} else {
				if ($("button#MReverse").hasClass("btn_on")) {
					cTime = duration *(parseInt(event.code.slice(-1))/10);
					MReverser(count, duration -cTime);
				} else {
					player.currentTime = duration *(parseInt(event.code.slice(-1))/10);
				};
			};
		};
	});
	// 定義し終わったらやるタイプのものたち, data.changeでリセットするならあっちで
	$("input.speed")[0].min = "0";
	if (window.innerHeight > window.innerWidth) window.alert("横画面の方が操作しやすいです");
	$("*").not("input[type=number], input[type=text]").focus(e => $(e.target).blur());
	// ダイアログ
	$("div#shadow").click(() => {$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100)});
});