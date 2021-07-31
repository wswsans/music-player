console.log("scriptV1.js Loaded!")
console.log((window.navigator.onLine) ? "Online" : "Offline")

const fReader = new FileReader()
fReader.onloadend = (event) => {
	// audio_file = document.createElement("source")
	// audio_file.src = event.target.result
	// audio_file.type = $("input#play_data")[0].files[count].type
	// $("audio#audio_player")[0].appendChild(audio_file)
	$("audio#audio_player")[0].src = event.target.result
	// $("input#seek")[0].max = Math.floor($("audio#audio_player")[0].duration * 10) / 10
	$("audio#audio_player")[0].play()
}
const start = (ct) => {
	fReader.readAsDataURL($("input#play_data")[0].files[ct])
	seekbar = setInterval(() => {
		$("input#seek")[0].max = $("audio#audio_player")[0].duration
		$("input#seek")[0].value = $("span#seek_show")[0].innerText = Math.floor($("audio#audio_player")[0].currentTime *10) /10
	}, 10)
	$("li").css({"border": "none"})
	$("li")[ct].style.border = "2px #000 solid"
	// if (ct > 0) $("li")[ct -1].style.border = "none"
	// if (ct < $("input#play_data")[0].files.length -1) $("li")[ct +1].style.border = "none"
}

let paused = false
let count = 0
let li = null
let started = false

$(() => {
	$("input#speed")[0].min = "0" 
	// 最初
	$("input#play_data")[0].onchange = () => {
		// リセット
		$("section#player").css({"display": "none"})
		$("input#loop")[0].checked = false
		$("input#speed")[0].value = 1; $("input#speed")[0].oninput()
		$("input#volume")[0].value = 1; $("input#volume")[0].oninput()
		count = 0
		started = false
		$("audio#audio_player")[0].currentTime = 0
		$("audio#audio_player")[0].pause()
		// リストにまとめる
		$("ul#play_list")[0].innerHTML = ""
		for (let i=0; i<$("input#play_data")[0].files.length; i++) {
			li = document.createElement("li")
			li.innerText = $("input#play_data")[0].files[i].name
			$("ul#play_list")[0].appendChild(li)
		}
	}
	$("button#start")[0].onclick = () => {
		if ($("input#play_data")[0].value == "") {
			console.log("Nothing")
			return;
		}
		$("body")[0].focus()
		start(0)
		started = true
		$("section#player").css({"display": "block"})
	}
	// 再生, 一時停止
	$("button#pause")[0].onclick = () => {
		if (paused) {
			$("audio#audio_player")[0].play()
			$("button#pause")[0].innerText = "| |"
		} else {
			$("audio#audio_player")[0].pause()
			$("button#pause")[0].innerText = "▷"
		}
	}
	// 次の曲
	$("button#next")[0].onclick = () => {
		$("audio#audio_player")[0].pause()
		$("audio#audio_player")[0].currentTime = 0
		if ($("input#play_data")[0].files.length > 1) {
			// console.log(count, $("input#play_data")[0].files.length)
			if ($("input#play_data")[0].files.length > (count + 1)) {
				count++
			} else {
				count = 0
			}
		}
		start(count)
	}
	// 前の曲
	$("button#back")[0].onclick = () => {
		$("audio#audio_player")[0].pause()
		$("audio#audio_player")[0].currentTime = 0
		if ($("input#play_data")[0].files.length > 1) {
			if (count > 0) {
				count--
			} else {
				count = $("input#play_data")[0].files.length - 1
			}
		}
		start(count)
	}
	// ループ
	$("input#loop")[0].onchange = () => $("audio#audio_player")[0].loop = $("input#loop")[0].checked
	// 速度
	$("input#speed")[0].oninput = () => $("span#speed_show")[0].innerText =  $("audio#audio_player")[0].playbackRate = $("audio#audio_player")[0].defaultPlaybackRate = $("input#speed")[0].value
	// $("input#speed")[0].onchange = () => { $("audio#audio_player")[0].playbackRate = $("audio#audio_player")[0].defaultPlaybackRate = $("input#speed")[0].value }
	// 音量
	$("input#volume")[0].oninput = () => $("span#volume_show")[0].innerText = $("audio#audio_player")[0].volume = ($("input#volume")[0].value + ".0").slice(0, 3)
	// $("input#volume")[0].onchange = () => { $("audio#audio_player")[0].volume = $("input#volume")[0].value }
	// シークバー
	$("input#seek")[0].oninput = () => $("audio#audio_player")[0].currentTime = $("input#seek")[0].value
	// 曲終了
	$("audio#audio_player")[0].onended = () => {
		if (! $("input#loop")[0].checked) {
			$("button#next")[0].onclick()
		}
	}
	$("audio#audio_player")[0].onpause = () => paused = true
	$("audio#audio_player")[0].onplay = () => paused = false

	document.onkeydown = function (event) {
		switch (event.code) {
			case "Slash":
				if (event.metaKey || event.ctrlKey) $("div#shadow")[0].style.display = $("div#dialog")[0].style.display = ($("div#dialog")[0].style.display == "block") ? "none" : "block";
				break
			case "Escape":
				$("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none"
				break
			case "ArrowLeft":
				if (!started) break;
				if ($("audio#audio_player")[0].currentTime > 5){
					$("audio#audio_player")[0].currentTime -= 5
				} else {
					$("audio#audio_player")[0].currentTime = 0
				}
				break
			case "ArrowRight":
				if (!started) break;
				if ($("audio#audio_player")[0].duration >= $("audio#audio_player")[0].currentTime + 5){
					$("audio#audio_player")[0].currentTime += 5
				} else {
					$("audio#audio_player")[0].currentTime = $("audio#audio_player")[0].duration
				}
				break
			case "ArrowUp":
				if (!started) break;
				if (parseFloat($("input#volume")[0].value) +0.1 <= 1){
					$("input#volume")[0].value = parseFloat($("input#volume")[0].value) + 0.1
				} else {
					$("input#volume")[0].value = 1
				}
				$("input#volume")[0].oninput()
				break
			case "ArrowDown":
				if (!started) break;
				if (parseFloat($("input#volume")[0].value) -0.1 >= 0){
					$("input#volume")[0].value = parseFloat($("input#volume")[0].value) - 0.1
				} else {
					$("input#volume")[0].value = 0
				}
				$("input#volume")[0].oninput()
				break
			case "Period":
				if (!started) break;
				if (!event.shiftKey) break;
				if (parseFloat($("input#speed")[0].value) +0.25 <= 10){
					$("input#speed")[0].value = parseFloat($("input#speed")[0].value) + 0.25
				} else {
					$("input#speed")[0].value = 10
				}
				$("input#speed")[0].oninput()
				break
			case "Comma":
				if (!started) break;
				if (!event.shiftKey) break;
				if (parseFloat($("input#speed")[0].value) -0.25 >= $("input#speed")[0].min){
					$("input#speed")[0].value = parseFloat($("input#speed")[0].value) - 0.25
				} else {
					$("input#speed")[0].value = 0
				}
				$("input#speed")[0].oninput()
				break
			case "KeyP":
				if (!started) break;
				$("button#pause")[0].onclick()
				break
			case "KeyL":
				if (!started) break;
				$("input#loop")[0].checked = !$("input#loop")[0].checked
				$("input#loop")[0].onchange()
				break
			case "KeyD":
				if (!started) break;
				$("button#next")[0].onclick()
				break
			case "KeyA":
				if (!started) break;
				$("button#back")[0].onclick()
				break
		}
		if (event.code.slice(0, -1) == "Digit") {
			if (event.metaKey || event.ctrlKey || !started) return;
			$("audio#audio_player")[0].currentTime = (Math.floor($("audio#audio_player")[0].duration *10) /10) *(parseInt(event.code.slice(-1))/10)
		}
	}
	$("div#shadow")[0].onclick = () => $("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none"
	$("div#shadow").css({"height": document.documentElement.clientHeight + "px", "width": document.documentElement.clientWidth + "px"})
	$("div#shadow")[0].style.display = $("div#dialog")[0].style.display = "none"
	setInterval(() => {(started) ? $("button#pause")[0].focus() : $("button#start")[0].focus()}, 10)

})
$(window).resize(() => {
	$("div#shadow").css({"height": document.documentElement.clientHeight + "px", "width": document.documentElement.clientWidth + "px"})
})