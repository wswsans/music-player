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
	// 変数設定
	data = $("input#play_data").prop("files")[ct];
	// 初期化
	// player.currentTime = 0
	// ロード
	window.setTimeout(() => waiting = false, 200);
	fReader.readAsDataURL(data);
	// 設定(読み込み完了したらやりたいもの)
	seekbar = window.setInterval(() => {
		if (player.duration == NaN) return;
		$("input#seek").prop({max: player.duration})
						.val(Math.floor(player.currentTime *10) /10);
		$("input#seek_show").val(`${$("input#seek").val()}`)
							.css({width: `${Math.floor(player.duration *10)}`.length *10})
							.prop({max: Math.floor(player.duration *10) /10});
		$("span#seek_duration").text(`/ ${Math.floor(player.duration *10) /10}`);
	}, 10);
	document.title = `▷ ${data.name}`;
	count = ct;
	$("li").css({border: "1px dotted #000"});
	$("li")[ct].style.border = "thick double #000";
	started = true;
	// ファイルデータ
	$("img#album_art").prop({src: ""});
	$("img#album_art").css({padding: "150px"});
	$("span#description").html("Title: <br>Artist: <br>Album: <br>Year: <br>Comment: <br>Track: <br>Genre: <br>");
	$("span#lyrics").html("Lyrics: <br>");
	if (data.type == "audio/wav") return;
	mediaTag.read(data, {
		onSuccess: function(res) {
			let pic = base64String = "";
			pic = res.tags.picture;
			if (pic) {
				base64String = "";
				for (i = 0; i < pic.data.length; i++) {
					base64String += String.fromCharCode(pic.data[i]);
				};
				$("img#album_art").css({padding: "0px"});
				$("img#album_art").prop({src: `data:${pic.format};base64,${window.btoa(base64String)}`});
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
		$("audio#audio_player").prop({currentTime: 0});
		player.pause();
		$("input#loop").prop({checked: false});
		$("input#speed").val(1); $("input#speed").change();
		$("input#volume").val(1); $("input#volume").change();
		$("section#player").css({display: "none"});
		$("table#lists").css({display: "none"});
		$("img#album_art").prop({src: ""});
		$("img#album_art").css({padding: "150px"});
		$("span#description").html("Title: <br>Artist: <br>Album: <br>Year: <br>Comment: <br>Track: <br>Genre: <br>");
		$("span#lyrics").html("Lyricks: <br>");
		if ($(e.target).val()) {
			$("button#start").css({cursor: "pointer"});
		} else {
			$("button#start").css({cursor: "not-allowed"});
		}
		// リストにまとめる
		$("ol#play_list").html("");
		for (let i=0; i<$("input#play_data").prop("files").length; i++) {
			$("<li>").appendTo("ol#play_list")
					.text($("input#play_data").prop("files")[i].name.split('.').slice(0, -1).join("."))
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
		$("section#player").css({display: "block"});
		$("table#lists").css({display: "block"});
	});
	// 再生, 一時停止
	$("button#pause").click((e) => {
		if (paused) {
			player.play();
			document.title = `▷ ${data.name}`;
			$(e.target).text("| |");
		} else {
			player.pause();
			document.title = `| | ${data.name}`;
			$(e.target).text("▷");
		};
	});
	// 次の曲
	$("button#next").click(() => {
		if (waiting) return;
		if ($("input#play_data").prop("files").length > 1) {
			// console.log(count, $("input#play_data").prop("files").length);
			if ($("input#play_data").prop("files").length > (count + 1)) {
				count++;
			} else {
				count = 0;
			};
		};
		start(count);
	});
	// 前の曲
	$("button#back").click(() => {
		if (waiting) return;
		if ($("input#play_data").prop("files").length > 1) {
			if (count > 0) {
				count--;
			} else {
				count = $("input#play_data").prop("files").length - 1;
			};
		};
		start(count);
	});
	$("input#skip_time").change((e) => 
		$(e.target).val(Math.floor($(e.target).val() *10) /10)
	);
	// 5秒次
	$("button#time_next").click(() => player.currentTime += parseFloat($("input#skip_time").val()) );
	// 5秒前
	$("button#time_back").click(() => player.currentTime -= parseFloat($("input#skip_time").val()) );
	// ループ
	$("input#loop").change((e) => $("audio#audio_player").prop({loop: $(e.target).prop("checked")}) );
	// 速度
	$("input#speed").on("input", (e) => $("input#speed_show")[0].value =  player.playbackRate = player.defaultPlaybackRate = $(e.target).val());
	$("button#speed_next").click(() => $("input#speed").val(parseFloat($("input#speed").val()) + 0.25).trigger("input"));
	$("button#speed_back").click(() => $("input#speed").val(parseFloat($("input#speed").val()) - 0.25).trigger("input"));
	$("input#speed_show").change((e) => $("input#speed").val($(e.target).val()).trigger("input"));
	// 音量
	$("input#volume").on("input", () => $("input#volume_show")[0].value = player.volume = ($(e.target).val() + ".0").slice(0, 3));
	$("button#volume_next").click(() => $("input#volume").val(parseFloat($("input#volume").val()) + 0.1).trigger("input"));
	$("button#volume_back").click(() => $("input#volume").val(parseFloat($("input#volume").val()) - 0.1).trigger("input"));
	$("input#volume_show").change((e) => $("input#volume").val($(e.target).val()).trigger("input"));
	$("button#mute").click((e) => {
		if ($("input#volume").val() == 0){
			$("input#volume").val($("input#volume").prop("vol"));
			$(e.target).text("X");
		} else {
			$("input#volume").prop({vol: $("input#volume").val()})
							.val(0);
			$(e.target).text(")))");
		};
		$("input#volume").trigger("input");
	});
	// シークバー
	$("input#seek").on("input", (e) => player.currentTime = $(e.target).val()).trigger("input");
	// 曲終了
	player.onended = () => {
		window.clearInterval(seekbar);
		if (! $("input#loop").prop("checked")) {
			if ($("input#shuffle").prop("checked")) {
				$("li")[ Math.floor(Math.random() * ($("input#play_data").prop("files").length)) ].click();
			} else {
				$("button#next").click();
			};
		};
	};
	player.onpause = () => (player.ended) ? "" : paused = true;
	player.onplay = () => paused = false;
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
				if (event.metaKey || event.ctrlKey || !started) return;
				$("input#play_data").click();
				$("input#play_data").change();
			case "Space":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (event.preventDefault) {
					event.preventDefault();
				}
				event.returnValue = false;
			case "KeyP":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#pause").click();
				break;
			case "ArrowLeft":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button#time_back").click();
				break;
			case "ArrowRight":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button#time_next").click();
				break;
			case "ArrowUp":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button#volume_next").click();
				break;
			case "ArrowDown":
				if (event.metaKey || event.ctrlKey || !started || document.activeElement.type == "number") return;
				$("button#volume_back").click();
				break;
			case "KeyM":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#mute").click();
				break;
			case "Period":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button#speed_next").click();
				break;
			case "Comma":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!event.shiftKey) break;
				$("button#speed_back").click();
				break;
			case "KeyL":
				if (event.metaKey || event.ctrlKey || !started) return;
				if (!started) break;
				$("input#loop").prop( {checked: !$("input#loop").prop("checked")} );
				$("input#loop").change();
				break;
			case "KeyS":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("input#shuffle").prop( {checked: !$("input#shuffle").prop("checked")} );
				break;
			case "KeyD":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#next").click();
				break;
			case "KeyA":
				if (event.metaKey || event.ctrlKey || !started) return;
				$("button#back").click();
				break;
		}
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
				$("audio#audio_player").prop({ currentTime: (Math.floor($("audio#audio_player").prop("duration") *10) /10) *(parseInt(event.code.slice(-1))/10) });
			};
		};
	});
	// 定義し終わったらやるタイプのものたち
	$("input#speed")[0].min = "0";
	if (window.navigator.platform.slice(0, 3) == "Win") {$("input#volume").val(0.5); $("input#volume").change()};
	// focus
	window.setInterval(() => {
		if ($("input#play_data").val()) {
			(started) ? $("button#start").blur() : $("button#start").focus();
		} else {
			$("input#play_data").focus();
		}
	}, 10);
	$.merge($("input[type=range], input[type=checkbox]"), $("button").slice(1)).focus((e) => e.target.blur());
	// ダイアログ
	$("div#shadow").click(() => {$("div#shadow").stop().fadeToggle(100); $("div#dialog").stop().fadeToggle(100)});
});
