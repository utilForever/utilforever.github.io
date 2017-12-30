/**
 * Created by lazzzis on 08/11/2016.
 */

// the side bar in the mobile environment

$('.button-collapse').sideNav({
		menuWidth: 150, // Default is 240
		edge: 'left', // Choose the horizontal origin
		closeOnClick: true, // Closes side-nav on <a> clicks, useful for Angular/Meteor
		draggable: true // Choose whether you can drag to open on touch screens
	}
);

// the highlight -- lineNumber
// https://github.com/wcoder/highlightjs-line-numbers.js
(function (w) {
	'use strict';

	if (typeof w.hljs === 'undefined') {
		console.error('highlight.js not detected!');
	} else {
		w.hljs.initLineNumbersOnLoad = initLineNumbersOnLoad;
		w.hljs.lineNumbersBlock = lineNumbersBlock;
	}

	function initLineNumbersOnLoad () {
		if (document.readyState === 'complete') {
			documentReady();
		} else {
			w.addEventListener('DOMContentLoaded', documentReady);
		}
	}

	function documentReady () {
		try {
			var blocks = document.querySelectorAll('code.hljs');

			for (var i in blocks) {
				if (blocks.hasOwnProperty(i)) {
					lineNumbersBlock(blocks[i]);
				}
			}
		} catch (e) {
			console.error('LineNumbers error: ', e);
		}
	}

	function lineNumbersBlock (element) {
		if (typeof element !== 'object') return;

		var parent = element.parentNode;
		var lines = getCountLines(parent.textContent);

		if (lines > 1) {
			var l = '';
			for (var i = 0; i < lines; i++) {
				l += (i + 1) + '\n';
			}

			var linesPanel = document.createElement('code');
			linesPanel.className = 'hljs hljs-line-numbers';
			linesPanel.style.float = 'left';
			linesPanel.textContent = l;

			parent.insertBefore(linesPanel, element);
		}
	}

	function getCountLines(text) {
		if (text.length === 0) return 0;

		var regExp = /\r\n|\r|\n/g;
		var lines = text.match(regExp);
		lines = lines ? lines.length : 0;

		if (!text[text.length - 1].match(regExp)) {
			lines += 1;
		}

		return lines;
	}
}(window));
$(document).ready(function() {
	hljs.initHighlightingOnLoad();
	hljs.initLineNumbersOnLoad();
	$('code.hljs').each(function(i, block) {
		hljs.lineNumbersBlock(block);
	});
});


// header opacity in scroll
$(window).scroll(function() {
  if ($(window).scrollTop() <= 50) {
      $('header nav').removeClass('inscroll');
  } else {
      $('header nav').addClass('inscroll');
  }
});

// ul default in article
$("article.article-full ul").addClass("browser-default");

// vedio fitvids
$(document).ready(function(){
    // Target your .container, .wrapper, .post, etc.
    $(".article-full").fitVids();
});


// zooming

$(".article-full img").attr("data-action", "zoom");
