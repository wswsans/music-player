console.log("scriptV1.js Loaded!");
console.log((window.navigator.onLine) ? "Online" : "Offline");

const fReader = new FileReader();
const mediaTag = window.jsmediatags;

let started = false;
let paused = false;
let count = 0;
let waiting = false;
let data = null;
let player = null;

fReader.onloadend = (event) => {
	$("audio#audio_player").prop({src: event.target.result});
	if (!paused) player.play();
};
const start = (ct) => {
	if (waiting) return;
	waiting = true;
	// ロード
	window.setTimeout(() => waiting = false, 200);
	fReader.readAsDataURL(data[ct]);
	// 設定(読み込み完了したらやりたいもの)
	document.title = `▷ ${data[ct].name.split('.').slice(0, -1).join(".")}`;
	count = ct;
	$("li").css("border", "1px dotted #000");
	$("li")[ct].style.border = "thick double #000";
	$("input#list_num").val(ct +1);
	started = true;
	// ファイルデータ
	$("img#album_art").css("padding", "150px")
						.prop("src", "");
	$("span#description").html("Title: <br>Artist: <br>Album: <br>Year: <br>Comment: <br>Track: <br>Genre: <br>");
	$("span#lyrics").html("Lyrics: <br>");
	if (data[ct].type == "audio/wav") return;
	mediaTag.read(data[ct], {
		onSuccess: function(res) {
			let pic = base64String = "";
			pic = res.tags.picture;
			if (pic) {
				base64String = "";
				for (i = 0; i < pic.data.length; i++) {
					base64String += String.fromCharCode(pic.data[i]);
				};
				$("img#album_art").css("padding", "0px")
								.prop({src: `data:${pic.format};base64,${window.btoa(base64String)}`});
			};
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
		onError: (error) => console.log("Error", error.info)
	});
};


$(() => {
	// 変数
	player = $("audio#audio_player")[0];
	// 定義er
	$("input#play_data").change((e) => {
		// リセット
		count = 0;
		started = false;
		waiting = false;
		document.title = "Music Player";
		player.currentTime = 0; player.pause();
		player.shuffle  = false;
		player.loop = false;
		player.preservesPitch = true;
		$("button.on_off").removeClass("on");
		$("input.range").val(1).trigger("input");
		$("input.seek.range").val(0).trigger("input");
		if (window.navigator.platform.slice(0, 3) == "Win") $("input.volume").val(0.5).trigger("input");
		$("section#player, table#lists").css("display", "none");
		if ($(e.target).val()) {
			$("button#start").css("cursor", "pointer");
		} else {
			$("button#start").css("cursor", "not-allowed");
		};
		// リストにまとめる
		data = $("input#play_data").prop("files");
		$("input#list_num").prop({max: data.length});
		$("ol#play_list").html("");
		for (let i=0; i<data.length; i++) {
			$("<li>").appendTo("ol#play_list")
					.text(data[i].name.split('.').slice(0, -1).join("."))
					.click(() => { if (count != i) start(i) });
		};
	});
	$("button#start").click(() => {
		if (waiting) return;
		if ($("input#play_data").val() == "") {
			console.log("Nothing");
			return;
		};
		paused = false;
		start(0);
		$("section#player").css("display", "block");
		$("table#lists").css("display", "block");
	});
	// 再生, 一時停止
	$("button#pause").click((e) => {
		if (paused) {
			player.play();
			document.title = `▷ ${data[count].name.split('.').slice(0, -1).join(".")}`;
			$(e.target).text("| |");
		} else {
			player.pause();
			document.title = `| | ${data[count].name.split('.').slice(0, -1).join(".")}`;
			$(e.target).text("▷");
		};
	});
	// 曲
	$("button.audio").click((e) => {
		if (waiting) return;
		count += {next: 1, back: -1}[e.target.className.split(" ")[1]]
		if (count < 0) count = data.length -1;
		if (data.length -1 < count) count = 0;
		start(count);
	});
	$("button.on_off").click((e) => {
		$(e.target).toggleClass("on");
		switch (e.target.id) {
			case "pitch":
				player.preservesPitch = !player.preservesPitch;
				break;
			case "loop":
				player.loop = !player.loop;
				break;
			case "shuffle":
				player.shuffle = !player.shuffle;
				break;
		};
	});
	$("button#shuffle_btn").click(() => {if (player.shuffle) $("li")[ Math.floor(Math.random() * (data.length)) ].click()});
	// 速度
	$("input.speed.range").on("input", (e) => $("input.speed.show")[0].value =  player.playbackRate = player.defaultPlaybackRate = $(e.target).val());
	// 音量
	$("input.volume.range").on("input", (e) => {
		$("input.volume.show")[0].value = player.volume = ($(e.target).val() + ".0").slice(0, 3);
		player.muted = !player.volume;
	});
	$("button#mute").click((e) => {
		player.muted = !player.muted;
		$("input.volume").val((player.muted) ? 0 : player.volume)
		$(e.target).text((player.muted) ? ")))" : "X");
	});
	// 速度, 音量 共通
	$("input.show.similar_num").change((e) => {
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
	// シークバー
	$("input.seek.range").on("input", (e) => player.currentTime = $(e.target).val());
	$("input.seek.show").change((e) => { // 上とはわざと分離させる, classNameをまとめた変数がないから長くなって無駄
		player.currentTime = $(e.target).val();
		$(e.target).blur();
	});
	window.setInterval(() => {
		if (!player.duration) return;
		duration = Math.floor(player.duration *10) /10;
		$("input.seek.range").prop({max: duration})
							.val(Math.floor(player.currentTime *10) /10);
		$("input.seek.show").css("width", `${duration *10}`.length *10)
							.prop({max: duration});
		if (document.activeElement.className != "seek show") $("input.seek.show").val(`${$("input.seek").val()}`);
		if ($("span#duration").text() != `/ ${duration}`) $("span#duration").text(`/ ${duration}`);
		$("ol#play_list").css("height", (document.documentElement.clientHeight -125) +"px");
	}, 10);
	// スキップ時間
	$("input.time.show").change((e) => $(e.target).val(Math.floor(Math.abs($(e.target).val()) *10) /10) );
	// 曲リスト
	$("input#list_num").change((e) => {
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
				$("input#play_data").click().change();
			case "Space":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (event.preventDefault) event.preventDefault();
				event.returnValue = false;
				$("button#pause").click();
				break;
			case "ArrowLeft":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.time.back").click();
				break;
			case "ArrowRight":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.time.next").click();
				break;
			case "ArrowUp":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.volume.next").click();
				break;
			case "ArrowDown":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button.volume.back").click();
				break;
			case "KeyP":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#pitch").click();
				break;
			case "KeyM":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#mute").click();
				break;
			case "Period":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button.speed.next").click();
				break;
			case "Comma":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button.speed.back").click();
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
			case "KeyD":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button.audio.next").click();
				break;
			case "KeyA":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button.audio.back").click();
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
				if (player.currentTime) player.currentTime = (Math.floor($("audio#audio_player").prop("duration") *10) /10) *(parseInt(event.code.slice(-1))/10);
			};
		};
	});
	// 定義し終わったらやるタイプのものたち, data.changeでリセットするならあっちで
	$("input.speed")[0].min = "0";
	if (window.innerHeight > window.innerWidth) alert("横画面の方が操作しやすいです")
	// focus
	window.setInterval(() => {
		if ($("input#play_data").val()) {
			(started) ? $("button#start").blur() : $("button#start").focus();
		} else {
			$("input#play_data").focus();
		};
	}, 10);
	$.merge($("input.range, input[type=checkbox]"), $("button").slice(1)).focus((e) => e.target.blur());
	// ダイアログ
	$("div#shadow").click(() => {$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100)});
});
