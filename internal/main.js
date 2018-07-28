/**
 * Главный файл внешнего ипотечного калькулятора
 */
var _$xc = new function () {
	var xcContentPath = 'http:/localhost:2999/xc';
	this.init = function (mainBoxId) {
		function loadMain() {
			var mainBox = document.getElementById(mainBoxId);
			if (!mainBox) {
				console.error('Не найден элемент с id=', mainBoxId);
				return;
			}
			mainBox.innerHTML = 'Загрузка...';
			// Имитация
			var boxWidth = 0, curWidth = '33%';
			function updateWidth() {
				var width = mainBox.clientWidth;
				if (width !== boxWidth) {
					boxWidth = width;
					var newWidth = '33%';
					if (boxWidth < 600) {
						newWidth = '50%';
					}
					if (newWidth != curWidth) {
						curWidth = newWidth;
						var list = mainBox.getElementsByClassName('xc-col');
						var i = 0, n = list.length;
						for (; i < n; i++) list[i].style.width = curWidth;
					}
				}
			}
			updateWidth();
			window.addEventListener('resize', updateWidth);
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {
						mainBox.innerHTML = this.response;
						// Этот код для прототипа
						var scripts = ['jquery', 'radon2', 'example'], counter = scripts.length;
						function loadScript(src) {
							var elem = document.createElement('script');
							document.body.appendChild(elem);
							elem.setAttribute('src', xcContentPath+'/'+src+'.js');
							elem.addEventListener('load', function () {
								if (!--counter) {
									Rn.bPageSwitch=0;
									Rn.init('main');
								}
							});
						}
						for (var i in scripts) loadScript(scripts[i]);
						///////////////////////
					} else {
						mainBox.innerHTML = 'Error ' + this.status;
					}
				}
			};
			xhr.open("GET", xcContentPath + '/box.html');
			xhr.send();
		}
		document.addEventListener('DOMContentLoaded', function () {
			loadMain();
		});
	}
}
