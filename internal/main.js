/**
 * Главный файл внешнего ипотечного калькулятора
 */
var _$xc = new function () {
	var xcContentPath = 'http:/localhost:2999/xc';
	function toggleClass(elem, className, bEnable) {
		var i, classSet = {}, classList = elem.getAttribute('class').split(' ');
		for (i in classList) classSet[classList[i]] = 1;
		if (bEnable) {
			if (classSet[className])
				return;	
			classList.push(className);
			
		} else {
			if (!classSet[className])
				return;
			delete classSet[className];
			classList.length = 0;
			for (i in classSet) classList.push(i);
		}
		elem.setAttribute('class', classList.join(' '));
	}
	this.init = function (mainBoxId) {
		function loadMain() {
			var mainBox = document.getElementById(mainBoxId);
			if (!mainBox) {
				console.error('Не найден элемент с id=', mainBoxId);
				return;
			}
			mainBox.innerHTML = 'Загрузка...';
			// Имитация
			var boxWidth = 0, curWidth = '33%', bWidePanelMode = true;
			function updateWidth() {
				var width = mainBox.clientWidth;
				console.log('box width = ', width);
				if (width !== boxWidth) {
					// Колонки, обозначенные классом xc-col
					boxWidth = width;
					var newWidth = '33%';
					if (boxWidth < 400) {
						newWidth = '100%';
					} else if (boxWidth < 680) {
						newWidth = '50%';
					}
					if (newWidth != curWidth) {
						curWidth = newWidth;
						var list = mainBox.getElementsByClassName('xc-col');
						var i = 0, n = list.length;
						for (; i < n; i++) list[i].style.width = curWidth;
					}
					// Панели (левая и правая), обозначенные xc-calc-panel
					var bWide = boxWidth >= 480;
					if (bWide !== bWidePanelMode) {
						bWidePanelMode = bWide;
						var list = mainBox.getElementsByClassName('xc-calc-panel');
						var i = 0, n = list.length;
						for (; i < n; i++) {
							toggleClass(list[i], 'xc-wide', bWide);
						}
						
					}
					
				}
			}
			function onReady() {
				Rn.bPageSwitch=0;
				Rn.init('main');
				updateWidth();
			}
			window.addEventListener('resize', updateWidth);
			var xhr = new XMLHttpRequest();
			xhr.onreadystatechange = function() {
				if (this.readyState == 4) {
					if (this.status == 200) {
						mainBox.innerHTML = this.response;
						// Этот код для прототипа
						// Скрипты загружаются по очереди, т.к. следующий уже может использовать любой предыдущий
						var scripts = ['radon2', 'example'];
						// если на странице уже подключен jQuery, используем его
						if (!window.jQuery) scripts.unshift('jquery');
						function loadScript(index) {
							if (index >= scripts.length) {
								onReady();
							} else {
								var src = scripts[index];
								var elem = document.createElement('script');
								document.body.appendChild(elem);
								elem.setAttribute('src', xcContentPath+'/'+src+'.js');
								elem.addEventListener('load', function () {
									loadScript(index + 1);
								});
							}
						}
						loadScript(0);
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
