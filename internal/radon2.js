/*!
 * Radon
 * Front-end data control system
 * Version 2.0
 * Created 2015-10-28 by PeterWin
 * Last modification: 2017-01-31
 */
/*!
 * Radon
 * Front-end data control system
 * Version 2.0
 * Created 2015-10-28 by PeterWin
 * Last modification: 2017-01-31
 */

/*
 Radon.init(startPageName='start') - required for system initialization
 2016-08-19 - Добавлено свойство unique в Radiobox (Иначе проблемы при использовании внутри Array)
 2016-10-11 - CtrlArray.addItem. Добавлен параметр srcParams
 2016-10-13 - Добавлен CtrlHidden
 2016-10-27 - dom2val открыта для всех контроллеров
 2016-10-31 - Добавлен метод submit() в класс FormBase
*/

var Log = [];
function _trace(msg) {
	if (window.console) {
		console.log(msg);
	}
	Log.push(msg);
}

var Radon = new function() {
	var self = this,
		curPage = 0,
		bPageSwitch,	// Это копия self.bPageSwitch, которая сохраняется в момент инициализации
		sessionCache = {}, e;
		
	self.Page = self.P = {};	// Классы страниц. P = краткий синоним для Page
	self.Form = self.F = {};	// Классы форм. F = краткий синоним для Form
	self.Ctrl = self.C = {};	// Классы контроллеров. C = краткий синоним для Ctrl
	self.Validator = self.V = {};	// Классы валидаторов
	self.Filter = {};	// Классы фильтров
	
	// Эти свойства можно настраивать только до вызова init()
	self.props = self.p = {
		bPageSwitch: 1,	// Переключение страниц
		start: 'start',	// Имя стартовой страницы
		
		// Классы DOM-элементов
		clsPage: 'rn-page',
		clsForm: 'rn-form',
		clsCtrl: 'rn-ctrl',
		clsValidator: 'rn-validator',
		clsFilter: 'rn-filter',

		clsInvalid: 'invalid',	// Класс назначается контейнеру контроллера, в котором возникла ошибка
		clsRequired: 'rn-required',	// класс, который назначается контроллеру в момент рендера, если его значение обязательно для заполнения
		clsPageRef: 'rn-page-ref',	// Ссылка на страницу, указанную через href="#name", либо data-page="name"
		clsBack: 'rn-back',	// Элемент для возврата на предыдущую страницу
		clsSubmit: 'rn-submit',	// Элемент сабмита формы,
		clsReset: 'rn-reset',	// Элемент очистки формы
		clsDisabled: 'disabled',		// класс, назначаемый запрещённым элементам
		clsDisabledBox: 'disabled-box',	// класс, назначаемый внешнему контейнеру запрещённого контроллера
		bUseDisabledAttr: 1,		// При запрещении элементов использовать атрибут disabled
		
		clsArrayBox: '.rn-array',	// Для CtrlArray. Контейнер для элементов массива, которые генерируются по шаблону item_tm
		clsArrayAdd: '.rn-add-item',	// Для CtrlArray. Селектор для кнопки добавления нового элемента
		clsArrayDel: '.rn-del-item',		// Для CtrlArray. Селектор кнопки удаления элемента массива

		// Встроенный шаблонизатор
		tmBegin: '{{',	// Начало параметра внутри шаблона
		tmEnd:	'}}'	// Конец параметра внутри шаблона
	};
	function getProp(name) {
		return self.p[name];
	}
	function getPropClass(name) {
		return '.'+getProp('cls'+name);
	}
	
	// OperaMini не поддерживает сессию. Имитируем её.
	// Аналогично IE11+file:
	// Конечно, при перезагрузке страницы данные пропадут. Но всё равно лучше, чем ничего
	function removeItem(name) {
			delete this[name];
	}
	var mySessionStorage = self.ss = window.sessionStorage || {
		removeItem: removeItem
	}
	var myLocalStorage = self.ls = window.localStorage || {
		removeItem: removeItem
	}
	
	self.Session = {
		get: function(name) {
			try {
				var s = mySessionStorage[name];
				return s ? JSON.parse(s) : null;
			} catch(e) {
				return null;
			}
		},
		set: function(name, data) {
			try {
				if (data) {
					mySessionStorage[name] = JSON.stringify(data);
				} else {
					mySessionStorage.removeItem(name);
				}
				return 1;
			} catch(e) {
				return 0;
			}
		}
	}
	
	self.Storage = new function() {
		var prefix = 'Rn_',e;
		this.get = function(id) {
			try {
				var text = myLocalStorage[prefix+id];
				if (text) {
					return JSON.parse(text);
				}
			} catch (e) {}
			return 0;
		}
		this.set = function(id, value) {
			var key = prefix+id, res=0;
			try {
				if (value) {
					myLocalStorage[key] = JSON.stringify(value);
				} else {
					myLocalStorage.removeItem(key);
				}
				res = 1;
			} catch(e) {}
			return res;
		}
	}

	function pageNameFromCurrentURL() {
		var url = location.hash;
		return url ? url.slice(1) : Rn.p.start;
	}

	// Основной менеджер состояний
	self.stateMgr = {
		push: function(pageName, url) {
			history.pushState(null, null, url);
			this.update();
		},
		init: function() {
			var mgr = this;
			$(window).on('popstate', function(ev){
				mgr.update();
			});
		},
		update: function() {
			var pageName = pageNameFromCurrentURL(),
				page = self.getPageEx(pageName);
			self._switchTo(page);
		},
		// Проверка работоспособности менеджера.
		// Например, не работает в хроме с протоколом file: из-за ограничений безопасности.
		test: function() {
			//return 0;
			if (location.protocol=='file:') {
				if (/Chrome/.test(navigator.userAgent)) {
					return false;
				}
			}
			// Opera Mini некорректно работает с popstate
			if (/Opera Mini/.test(navigator.userAgent))
				return false;
			return 'pushState' in history;
		},
		id: 'Main'
	};
	
	// Альтернативный менеджер состояний, который подключается в том случае, если не сработал основной
	self.stateMgr2 = new function() {
		var mgr = this;
		this.push = function(pageName, url) {
			location.hash = url;
			// далее сработает обработчик hashchange, который вызовет update
		}
		this.init = function() {
			$(window).on('hashchange', function(e){
				e.preventDefault();
				_trace('Mgr2: hashchange');
				mgr.update();
				return false;
			});
		}
		this.update = function() {
			var pageName = pageNameFromCurrentURL();
			_trace('Mgr2.update, pageName = '+pageName);
			Rn._switchTo(Rn.getPageEx(pageName));
		}
		this.test = function() {
			return 1;
		}
		this.id = 'Alt';
	};
	
	/**
	 * Словарь страниц.
	 * @dict
	 * @type {Object<string,PageBase>}
	 */
	self.pages = {};
	
	/**
	 * Извлечь имя страницы из урла.
	 * Стандартная реализация предполагает, что имя страницы совпадает с хешом.
	 * В случае отсутствия хеша имя страницы считается start
	 * Если для страниц переопределяется getURL, то необходимо переопределить и эту функцию
	 * @param {string} URL
	 * @return {string} Имя страницы
	 */
	self.nameFromURL = function(URL) {
		var k = URL.lastIndexOf('#');
		return k<0 ? '' : URL.substring(k+1);
	}
	
	self.makeFullURL = function(url) {
		if (url[0]=='#') {
			url = location.origin + location.pathname + url;
		}
		return url;
	}
	
	/**
	 * Получение страницы по названию
	 * @param {string} pageName
	 * @return {PageBase}
	 * @throws {Error}
	 */
	self.getPageEx = function(pageName) {
		var page = self.pages[pageName];
		if (!page)
			throw new Error('Page not found: '+pageName);
		return page;
	}
	
	self.curPage = function() {
		return curPage;
	}
	
	/**
	 * Переключить dom-элемент в разрешенное или запрещенное состояние
	 * @param {string|DOMElement|jQuery} target	Селектор, ДОМ-элемент или jQ-объект
	 * @param {boolean=true} bEnable	Бинарный признак разрешить или запретить
	 */
	self.enable = function(target, bEnable) {
		target = $(target);
		if (bEnable === undefined) bEnable = 1;
		target.toggleClass(Rn.p.clsDisabled, !bEnable);
		if (self.p.bUseDisabledAttr)
			target.prop("disabled", !bEnable);
	}
	
	self.isDisabled = function(target) {
		target = $(target);
		return target.hasClass(Rn.p.clsDisabled);
	}
	
	// Основная инф. об ошибке берётся из msg. Но можно воспользоваться ctrl.lastErr
	self.onCtrlError = function(ctrl, msg) {
		ctrl.$def.attr('title', msg || '').toggleClass(self.p.clsInvalid, !!msg);
	}
	
	/**
	 * Создание Radon-объекта
	 * @param {string} className	Required. Short class name. For example, 'Base'. 
	 * @param {string=''} prefix	Class prefix. F.ex: 'Ctrl'
	 * @return {!Object}	Radon Object
	 * @throws {Error}
	 */
	function createObj(className, prefix) {
		className = className || 'Base';	// Если класс не указан, считаем его Base
		var fullName = (prefix || '')+className,	// full class name, f.e: 'CtrlBase'
			// constructor function
			constr = self[prefix][className] || window[fullName];
		if (!constr)
			throw new Error('Class not found: '+fullName);
		var
			inst = new constr,
			superClass = inst.superClass;

		// if superClass defined...
		if (superClass) {
			// create superClass instance
			var key, extKey, superInst = createObj(superClass, prefix);
			// All elements are copied from parent to child
			// If the property already exists, add a prefix. for example: Base_name
			for (key in superInst) {
				extKey = (key in inst) ? (superClass+'_'+key) : key;
				inst[extKey] = superInst[key];
			}
		}
		inst.parents = inst.parents || [];
		inst.parents.unshift(className);
		inst.type = className;
		return inst;
	}
	self.createObj = createObj;
	
	/**
	 * Создание Radon-объекта из элемента-описателя.
	 * Используется атрибут data-type. Кроме того, все атрибуты data-xxx переводятся в поля с соответствующими именами xxx.
	 * @param {jQuery|DOMElement|string} $def	jQuery-объект, DOM-элемент или селектор, соответствующий элементу-описателю.
	 * @param {string} prefix
	 * @param {string} defaultType
	 * @return {!Object}
	 */
	function createObjFromDef($def, prefix, defaultType) {
		$def = $($def);
		var obj = createObj($def.data('type') || defaultType || 'Base', prefix);
		obj.$def = $def;
		obj.name = $def.attr('name');
		$.extend(obj, $def.data());
		return obj;
	}
	self.createObjFromDef = createObjFromDef;
	
	/**
	 * Создание страницы по описанию
	 * Созданная страница сразу же регистрируется в Rn.pages
	 * @param {jQuery} $def	jQuery-объект описания страницы.
	 * @return {PageBase}
	 */
	function createPage($def) {
		if (!bPageSwitch) {
			// Если механизм переключения страниц отключен, то страница должна стать видимой
			$def.show();
		}
		var page = createObjFromDef($def, 'Page');
		page.forms = {};
		self.pages[page.name] = page;

		page.title = page.title || $('h1',$def).text();
		self.initForms(page, $def);
		
		page.onInit();

		return page;
	}
	
	function createForm($def, page) {
		var form = createObjFromDef($def, 'Form');
		page.forms[form.name] = form;
		form.page = page;
		form.ctrls = {};
		self.initCtrls(form, form.$def);
		// Кнопка сброса
		$(getPropClass('Reset'), $def).click(function(){
			form.reset();
			Rn.update();
			return false;
		});
		// Кнопка сабмита
		form.$submit = $(getPropClass('Submit'), $def);

		function onSubmit() {
			return form.submit();
		}
		if ($def.is('form')) {
			// Если для $def использован тег FORM, тогда нужно повесить на него событие onsubmit
			$def.submit(onSubmit);
		} else {
			// Иначе привязываемся к клику на элементы .rn-submit
			form.$submit.click(onSubmit);
		}
		form.onInit();
		form.autoStore(1);	// Возможная загрузка ранее сохранённых данных
		return form;
	}
	
	function createCtrl($def, form, owner) {
		owner = owner || form;
		var ctrl = createObjFromDef($def, 'Ctrl');
		ctrl.form = form;
		// Поиск владельца
		var $owner = $def.parents(getPropClass('Ctrl')+':first');
		if ($owner.length) {
			// Ищем владельца
			owner.walk({
				ctrlBegin: function(curCtrl) {
					if (curCtrl.$def[0] == $owner[0]) {
						owner = curCtrl;
					}
				}
			});
		}
		ctrl.owner = owner;
		owner.addCtrl(ctrl);
		function createSubCtrl(element, prefix) {
			var data = $(element).data(),
				type = data.type,
				obj = createObj(type, prefix);
			$.extend(obj, data);
			obj.ctrl = ctrl;	// назначить владельца валидатора|фильтра
			return obj;
		}
		// Валидаторы
		$def.children(getPropClass('Validator')).each(function(){
			ctrl.validators.push(createSubCtrl(this, 'Validator'));
		});
		// Фильтры
		$def.children(getPropClass('Filter')).each(function(){
			ctrl.filters.push(createSubCtrl(this, 'Filter'));
		});
		
		ctrl.render();
		ctrl.makeRequired();
		ctrl.enable(!ctrl.disabled);

		var vInit = {};
		vInit.ctrlBegin = vInit.validator = vInit.filter = function(obj) {
			obj.onInit();
		}
		ctrl.walk(vInit);
		return ctrl;
	}
	this.createCtrl = createCtrl;
	
	/**
	 * Инициализация страниц, объявленных при помощи .j-page
	 * Вызывается из init().
	 * Специально вызывать эту функцию может потребоваться только в случае динамической подгрузки контента, в котором содержатся объявления страниц.
	 * @param {jQuery|null} $scope	Элемент, внутри которого лежат объявления. Если не указан, то поиск по всему документу.
	 */
	self.initPages = function($scope) {
		// класс для страниц
		$(getPropClass('Page'), $scope).each(function(){
			createPage($(this));
		});
	}
	
	self.initForms = function(page, $scope) {
		// .rn-form
		$(getPropClass('Form'), $scope).each(function(){
			createForm($(this), page);
		});
	}
	
	self.initCtrls = function(form, $scope, owner) {
		$(getPropClass('Ctrl'), $scope).each(function(){
			createCtrl($(this), form, owner);
		});
	}
	
	function openPage(page) {
		var visitor = {}
		visitor.pageBegin = visitor.formBegin = visitor.ctrlBegin = function(obj) {
			obj.onOpen();
		}
		page.$def.show();
		try {
			page.walk(visitor);
		} catch (e) {
			_trace('Error in openPage walk: '+e.message);
			if (e.stack) {
				_trace(e.stack);
			}
		}
		self.update();
	}
	
	function closePage(page) {
		var visitor = {};
		visitor.formBegin = visitor.pageBegin = visitor.ctrlBegin = function(obj) {
			obj.onClose();
		}
		page.walk(visitor);
		page.$def.hide();
	}
	
	self._switchTo = function(page) {
		if (curPage) {
			closePage(curPage);
		}
		curPage = page;
		openPage(page);
	}
	
	/**
	 * Сделать активной указанную страницу
	 * @param {string} pageName	имя страницы, которую нужно сделать активной
	 */
	self.activate = function(pageName) {
		var page = self.getPageEx(pageName);
		self.stateMgr.push(pageName, page.getURL());
	}
	
	var updateTimerId = 0,
		updateVisitor = new function() {
			function callUpdate(obj) {
				obj.onUpdate();
			}
			this.pageBegin = this.formBegin = this.ctrlBegin = callUpdate;
			this.formEnd = function(obj) {
				obj.postUpdate();
				obj.autoStore();	// Возможное сохранение введенных данных
			}
			this.ctrlEnd = function(obj) {
				obj.makeRequired();	// Необходимость этого вызова несколько спорна, т.к. требуется редко, а вызывается постоянно.
				// Имеет смысл только для валидаторов, которые могут менять результат check(''). 
			}
		};
	function realUpdate() {
		updateTimerId = 0;
		self.curPage().walk(updateVisitor);
	}
	
	/**
	 * Оповещение о любых изменениях.
	 * Вызывает событие onUpdate у всех Radon-объектов текущей страницы.
	 * Оптимизоровано для большого количества вызовов.
	  * При загрузке данных каждый контроллер вызывает update, но onUpdate стаботает только один раз, когда всё загрузится.
	 */
	self.update = function() {
		if (!updateTimerId) {
			updateTimerId = setTimeout(realUpdate, 1);
			if (!updateTimerId) {
				// Такое бывает в OperaMini
				realUpdate();
			}
		}
	}
	
	/**
	 * Рекомендуемый способ загрузки данных, т.к. автоматически обновляет состояние системы.
	 * @param {RadonObject} target	Страница, форма или контроллер.
	 * @param {Object} srcObj		Загружаемые данные. Могут иметь различную структуру, в зависимости от типа target.
	 */
	self.load = function(target, srcObj) {
		target.load(srcObj);
		self.update();
	}
	
	var resetVisitor = new function(){
		this.pageBegin = this.formBegin = this.ctrlBegin = function(obj) {
			if (obj.onReset)
				obj.onReset();
		}
	}
	// Функция сброса указанного объекта (страницы, формы, контроллера)
	self.reset = function(target) {
		target.walk(resetVisitor);
	}
	
	/**
	 * Стартовая инициализация системы Radon
	 * @param {string="start"} startPageName Имя стартовой страницы. В случае отсутствия предполагается имя "start"
	 * @param {jQuery|null} $scope	Элемент, внутри которого будет происходить поиск элементов .j-page.
	 *                              Если не указан, то поиск пройдёт по всему документу.
	 */
	self.init = function(startPageName, $scope) {
		if (!self.stateMgr.test())
			self.stateMgr = self.stateMgr2;
		self.stateMgr.init();
		
		startPageName = startPageName || self.p.start;
		bPageSwitch = getProp('bPageSwitch');
		self.pages = {}
		self.initPages($scope);

		// Определить текущую страницу
		startPageName = self.nameFromURL(location.href) || startPageName;
		curPage = self.getPageEx(startPageName);
		openPage(curPage);
		
		// Стандартные события
		// Нажатие на элемент с классом rn-back
		$(document).on('click', getPropClass('Back'), function(){
			history.back();
			return false;
		});
		
		// Ссылки, иеющие класс rn-page-ref автоматически переключают страницу, указанную через href или data-page (более приоритетно)
		$(document).on('click', getPropClass('PageRef'), function(){
			var a = $(this),
				pageName = a.data('page') || a.attr('href');
			if (pageName) {
				if (pageName[0]=='#') pageName=pageName.slice(1);
				self.activate(pageName);
				return false;
			}
		});
		
		// Чтобы пропустить событие
		setTimeout(function(){
			$(window).on('pageshow', function(){
				_trace('onpageshow');
				// Ситуация следующая: страница открыта при помощи нажатия кнопки браузера Назад (либо history.back())
				// Браузер может сбросить значения дом-элементов input. Их надо восстановить.
				Rn.curPage().walk({
					ctrlBegin: function(ctrl) {
						ctrl.val2dom();
					}
				});
				Rn.update();
			});
		},1);
	}
	
	/**
	 * Экранирование специальных символов html: &lt; &gt; &quot;
	 * @param {string} s	Исходная строка
	 * @return {string}		Экранированная строка
	 */
	self.esc = function(s) {
		return (s+'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
	}
	
	/**
	 * Встроенный шаблонизатор.
	 * Подставляет параметры в текст шаблона.
	 * @param {string} text	Исходные текст шаблона с инструкциями {{}}
	 * @param {Object<string,string|number|boolean>} params	Параметры, подставляемые в шаблон
	 * @return {string} Результат шаблонизации.
	 */
	self.templTextImpl = function(text, params) {
		var tmBegin = Rn.p.tmBegin, tmEnd = Rn.p.tmEnd;	// Символы для обозначения конструкций {{ и }}
		params = params || {};
		var i, srcChunks = text.split(tmBegin),
			dstChunks = [srcChunks[0]];
		for (i=1; i<srcChunks.length; i++)
			srcChunks[i] = srcChunks[i].split(tmEnd);
		
		function ignore(j) {
			dstChunks.push(tmBegin+srcChunks[j][0]+tmEnd);
		}
		function addValue(j, key, bNoEscape) {
			if (key in params) {
				var value = params[key];
				if (!bNoEscape) value = Rn.esc(value);
				dstChunks.push(value);
				return 1;
			} else ignore(j);	// Если параметра нет, то оставляем конструкцию {{key}}
		}
		function condition(mode, key, begin, end) {
			var value = params[key], j=begin, finkey='/'+key;
			if (mode=='^') value = !value;
			while (j<end && srcChunks[j][0]!=finkey) j++;	// поиск закрывающего тега
			if (j==end) {	// Если закрывающий тег не найден, игнорируем условную ветку
				ignore(begin);
			} else {
				if (value) {
					dstChunks.push(srcChunks[begin][1]);
					range(++begin, j);
				}
				begin = j;
			}
			return begin;
		}
		function range(begin, end) {
			while (begin<end) {
				var first = $.trim(srcChunks[begin][0]);
				switch (first[0]) {
				case '#':	// условная секция
				case '^':
					begin = condition(first[0], first.slice(1), begin, end);
					break;
				case '{':	// неэкранированное значение
					if (addValue(begin, first.slice(1), 1))
						srcChunks[begin][1] = srcChunks[begin][1].slice(1); // Убрать лишний }
					break;
				case '?':	// Параметр, который в случае отсутствия заменяется на пустую строку
					var key = first.slice(1);
					params[key] = params[key] || '';
					addValue(begin, key);
					break;
				default:	// экранированное значение
					addValue(begin, first);
				}
				dstChunks.push(srcChunks[begin++][1]);	// кусок текста после }}
			}
		}
		range(1, srcChunks.length);
		return dstChunks.join('');
	}
	
	/**
	 * Переменная, позволяющая переопределить шаблонизатор
	 */
	self.templText = self.templTextImpl;
	
	/**
	 * Найти шаблон по идентификатору и сгенерировать текст, используя переданные параметры
	 * @param {string} tmId		Идентификатор шаблона
	 * @param {Object=} params	Параметры, подставляемые в шаблон в виде словаря {key=>value}. Необязательно.
	 * @return {string}	Возвращает сгенерированный текст
	 */
	self.templIdImpl = function(tmId, params) {
		var elem = document.getElementById(tmId);
		return elem ? self.templText(elem.innerHTML, params) : '';
	}
	/**
	 * Переменная, позволяющая переопределить шаблонизатор
	 */
	self.templId = self.templIdImpl;
	
	/**
	 * Наиболее часто вызываемая функция для применения шаблона
	 * Позволяет сразу применить полученный html-текст к указанному владельцу.
	 * Не требует переопределения, т.к. вызывает Rn.templId, которую и следует переопределять для подключения стороннего шаблонизатора.
	 * @param {string} tmId Идентификатор шаблона
	 * @param {Object=} params Параметры, подставляемые в шаблон
	 * @param {jQuery=} $owner Необязательный владелец, в который будет вставлен полученный элемент
	 * @param {number=} mode 0=append, -1=prepend, 1=html(т.е. старое содержимое удаляется). По-умолчанию=0
	 * @return {jQuery} Возвращает jQuery-объект, сформированный из текста, полученного в результате шаблонизации
	 */
	self.tm = function(tmId, params, $owner, mode) {
		var $result = $(self.templId(tmId, params));
		if ($owner) {
			if (!mode) {
				// Вариант mode=0 => append
				$owner.append($result);
			} else if (mode<0) {
				// Вариант mode=-1 => prepend
				$owner.prepend($result);
			} else {	// Вариант mode=1 => заместить всё содержимое
				$owner.html($result);
			}
		}
		return $result;
	}
	
	/**
	 * Проверка существования указанного шаблона
	 */
	self.hasTm = function(tmId) {
		return !!document.getElementById(tmId);
	}
	
	/**
	 * Поиск шаблона для указанного объекта.
	 * Если не найден, генерируется исключение.
	 */
	self.findTm = function(obj, prefix) {
		// возможно, что шаблон указан явно
		var tm = obj.tm;
		if (tm && self.hasTm(tm))
			return tm;
		// Иначе ищем по типу. Начинаем с типа объекта и повышаем уровень родителя.
		var i, fullName, types = obj.parents;
		for (i in types) {
			fullName = 'Tm'+prefix+types[i];
			if (Rn.hasTm(fullName))
				return fullName;
		}
		throw new Error('Template not found for type: '+prefix+obj.type);
	}
	
	self.setTextHandler = function($item, handler) {
		$($item).keyup(handler).change(handler).on('input', handler);
	}
	
	/**
	 * Стандартный алгоритм сохранения данных для контроллера
	 * @param {CtrlBase} ctrl
	 * @param {Object} dstObj
	 * @param {boolean=false} bSubmit
	 */
	self.saveCtrl = function(ctrl, dstObj, bSubmit) {
		// Если указан bSubmit, то сохранение происходит только для видимых контроллеров
		// Если не указан флаг bSubmit, сохранение происходит всегда, т.к. иначе могут пропасть данные при промежуточном сохранении формы
		if (!bSubmit || ctrl.isVisible()) {
			ctrl.save(dstObj, bSubmit);
			if (bSubmit)
				ctrl.filter(dstObj);
		}
	}

	/**
	 * Поиск объекта по элементу-описателю
	 * @param def	Описатель объекта. Либо jQuery, либо DOM-объект
	 * @param root	Radon-Объект, внутри которого идёт поиск
	 * @return {RadonObject|null} или null, если не найдено соответствия
	 */
	self.findByDef = function(def, root) {
		if (!def)
			return null;
		def = $(def);
		root = root || self.curPage();
		var visitor = {};
		visitor.ctrlBegin = visitor.formBegin = visitor.pageBegin = function(obj) {
			if (obj.$def[0] === def[0])
				visitor.result = obj;
		}
		root.walk(visitor);
		return visitor.result;
	}

	// Разбор регулярного выражения.
	// В ряде случаев оно указано в описании контроллера примерно так: data-regexp="/^[A-Z]+$/i"
	// Нужно получить RegExp
	self.parseRegexp = function(expSrc) {
		if (typeof expSrc != 'string')
			return expSrc;
		// Необходимо разложить конструкцию /exp/suffix
		var k1 = expSrc.indexOf('/'),
			k2 = expSrc.lastIndexOf('/');
		if (k2<=k1)
			throw new Error('Invalid regexp definition: '+expSrc);
		var exp = expSrc.substring(k1+1, k2),
			suffix = expSrc.substring(k2+1);
		return new RegExp(exp, suffix);
	}

	/**
	 * Выполнить глубокую проверку иерархии контроллеров
	 * @param {Object} object	Контроллер или форма
	 * @param {Array<{msg:string, ctrl:Object}>=} errList	Список ошибок
	 * @return {Array<{msg:string, ctrl:Object}>}	Список ошибок. Если указан параметр errList, то он же и возвращается
	 */
	self.checkDeep = function (object, errList) {
		errList = errList || [];
		var visitor = {
			ctrlBegin: function(ctrl) {
				var res = ctrl.check(errList);
				if (res) {
					errList.push({msg:res, ctrl:ctrl});
				}
				ctrl.lastErr = 0;
			},
			formEnd: function(form) {
				form.check(errList);
			}
		};
		object.walk(visitor);
		return errList;
	}

}, Rn = Radon;


var RadonObject = new function() {
	this.onInit = this.onReset = this.onOpen = this.onClose = this.onUpdate = function() {
	}
};


//==================================================================
//		PageBase
//==================================================================
function PageBase() {
	/**
	 * Заголовок страницы
	 * @type {string}
	 */
	this.title = '';
	/**
	 * Словарь форм
	 * @type {Object<string,FormBase>}
	 */
	this.forms = {};
	
	/**
	 * Обход содержимого страницы
	 * @param {Object} visitor
	 */
	this.walk = function(visitor) {
		if (visitor.pageBegin)
			visitor.pageBegin(this);
		for (var formName in this.forms) {
			if (visitor.result)
				break;
			this.forms[formName].walk(visitor);
		}
		if (visitor.pageEnd)
			visitor.pageEnd(this);
	}
	
	this.isActive = function() {
		return Rn.curPage() == this;
	}
	
	/**
	 * Сохранение содержимого страницы в объект данных
	 * Данные каждой формы записываются в виде отдельного объекта, название которого соответствует имени формы.
	 * @param {Object=} dstObj		Объект для сохранения данных. Он же является результатом функции. Если не указан, будет создан.
	 * @param {boolean=} bSubmit	Признак "чистового" сохранения. Обычно используется для сабмита. "Черновое" сохранение используется для промежуточного хранения данных.
	 * @return {!Object}	Объект с данными. Если указан параметр dstObj, то этот же объект будет в результате.
	 */
	this.save = function(dstObj, bSubmit) {
		dstObj = dstObj || {};
		var name, forms = this.forms;
		for (var name in forms) {
			forms[name].save(dstObj[name] = {}, bSubmit);
		}
		return dstObj;
	}
	
	/**
	 * Загрузка содержимого страницы
	 * Обновляет только указанные элементы. Если нужна полная перезагрузка структуры, то перед load нужно вызывать reset.
	 * @param {Object} srcObj	объект, который должен содержать вложенные объекты с ключами, соответствующими названиям форм
	 */
	this.load = function(srcObj) {
		if (typeof srcObj != 'object')
			return;
		var formName, forms = this.forms;
		for (formName in forms) {
			if (formName in srcObj) {
				forms[formName].load(srcObj[formName]);
			}
		}
	}
	
	/** Сброс данных страницы в значения по-умолчанию.
	 */
	this.reset = function() {
		Rn.reset(this);
	}
	
	this.getURL = function() {
		return '#'+this.name;
	}
} // PageBase
PageBase.prototype = RadonObject;


//==================================================================
//		FormBase
//==================================================================
Rn.F.Base = function() {
	/**
	 * Словарь контроллеров
	 * @type {Object<string,CtrlBase>}
	 */
	this.ctrls = {};
	
	this.ok = 1;	// Статус формы. Меняется при вызове update. Если 0(false), то сабмит запрещён
	
	this.addCtrl = function(ctrl) {
		this.ctrls[ctrl.name] = ctrl;
	}
	
	/**
	 * Обход содержимого формы
	 */
	this.walk = function(visitor) {
		if (visitor.formBegin)
			visitor.formBegin(this);
		for (var ctrlName in this.ctrls) {
			if (visitor.result)
				break;
			this.ctrls[ctrlName].walk(visitor);
		}
		if (visitor.formEnd)
			visitor.formEnd(this);
	}

	this.submit = function() {
		var form=this, result=false;
		try {
			if (form.ok) {
				form.onSubmit();
				result = form.result || false;
			}
		} catch (e) {
			if (window.console) {
				console.error(e);
			}
		}
		return result;
	}
	
	/**
	 * Сохранение данных формы в объект
	 * Данные каждого контроллера записываются в поле, названное именем контроллера. А структура данных уже зависит от типа контроллера.
	 * @param {Object=} dstObj	Объект, в который сохраняются данные. Он же является результатом функции. Если не указан, то будет создан.
	 * @param {boolean=} bSubmit	Признак "чистового" сохранения.
	 */
	this.save = function(dstObj, bSubmit) {
		dstObj = dstObj || {};
		var name, ctrls = this.ctrls;
		for (name in ctrls) {
			Rn.saveCtrl(ctrls[name], dstObj, bSubmit);
		}
		return dstObj;
	}
	
	/**
	 * Загрузка данных для формы из указанного объекта.
	 * @param {Object} srcObj	Обычно содержит пары ключ-значение. Но в общем случае каждый контроллер сам определяет способ чтения данных из объекта.
	 */
	this.load = function(srcObj) {
		for (var ctrlName in this.ctrls) {
			this.ctrls[ctrlName].load(srcObj);
		}
	}
	
	// Автоматическое сохранение и загрузка данных формы. Вызывается автоматически. Может быть переопределено
	// Вызов c bLoad происходит сразу после инициализации формы
	// Вызов без bLoad происходит после каждого update (после того как вызваны onUpdate всех контроллеров)
	// Стандартное поведение:
	// Если в свойствах формы указаны storage_key или session_key, то сохранение происходит в обоих случаях
	// А загрузка в первую очередь из сессии(session), далее из локального хранилища(storage).
	// Конечно, функции загрузки и сохранения различны. Но объединены в одну из-за их взаимного соответствия,
	// чтобы нельзя было переопределить одну и забыть другую
	this.autoStore = function(bLoad) {
		var form = this, stream;
		function store(keyProperty, storage) {
			var key = form[keyProperty];
			if (key) {
				if (bLoad) {
					stream = storage.get(key);
					if (stream) {
						form.load(stream);
						return 1;	// чтобы не вызвать загрузку из следующего источника
					}
				} else {
					stream = stream || form.save();	// Сохранение только один раз и только если есть хотя бы один ключ
					storage.set(key, stream);
				}
			}
		}
		store('session_key', Rn.Session) || store('storage_key', Rn.Storage);
	}

	this.onInit = function() {
		// Стандартное поведение формы при инициализации:
		// Если есть свойство data_src, то этот объект ищется в глобальной области и из него загружаются данные
		var data, dataSrc = this.data_src;
		if (dataSrc) {
			data = window[dataSrc];
			if (data) {
				this.load(data);
			}
		}
	}
	
	this.reset = function() {
		Rn.reset(this);
	}

	/**
	 * Искуственно установить фокус на форму.
	 * Если есть контроллер, имеющий признак autofocus, то фокус получит он
	 * Иначе - первый контроллер формы
	 */
	this.focus = function() {
		var name, ctrls=this.ctrls, ctrls, first = 0, af = 0;
		for (name in ctrls) {
			ctrl = ctrls[name];
			first = first || ctrl;
			if (ctrl.autofocus && !af)
				af = ctrl;
		}
		af = af || first;
		if (af)
			return af.focus();
	}
	
	// Общая проверка формы. Вызывается после валидации всех контроллеров
	// Переопределяется наследниками, чтобы добавить проверки, не связанные с каким-то контроллером
	this.check = function(errList) {
	}

	// Событие, вызываемое после обновления формы
	// Служит для проверки валидности формы
	this.postUpdate = function() {
	
		// собрать список ошибок
		var i, ctrl, e, errList = [];
		Rn.checkDeep(this, errList);

		// Распределить ошибки по контроллерам
		for (i in errList) {
			e = errList[i];
			ctrl = e.ctrl;
			if (ctrl) ctrl.lastErr = ctrl.lastErr || e;
		}
		
		// показать информацию о наличии или отсутствии ошибки контроллера
		this.walk({
			ctrlBegin: function(ctrl) {
				var lastErr = ctrl.lastErr;
				ctrl.onError(lastErr ? lastErr.msg : 0);
			}
		});
		
		// Сменить статус формы, в зависимости от наличия или отсутствия ошибок
		this.enableSubmit(this.ok = !errList.length);
		this.onPostUpdate();
	}
	
	// Событие, вызываемое после валидации формы
	this.onPostUpdate = function() {
	}
	
	// Обработка ошибки контроллера.
	// Может быть переопределён для формы с целью унификации поведения.
	// По-умолчанию вызывает глобальный обработчик.
	this.onCtrlError = function(ctrl, msg) {
		Rn.onCtrlError(ctrl, msg);
	}
	
	/**
	 * Событие - сабмит формы
	 * Необходимо перопределять в потомках
	 */
	this.onSubmit = function() {
		var data = this.save({}, 1);
		alert("Submit of ["+this.name+"] form: \n"+JSON.stringify(data));
		return false;
	}
	
	// Запретить кнопку сабмита (для предотвращения повторной отправки формы)
	// Рекомендуется вызывать внутри onSubmit, если принято решение обработать форму.
	// Следует учесть, что как только вызовется Rn.update, состояние будет автоматически установлено по результатам валидации формы
	this.enableSubmit = function(bEnable) {
		Rn.enable(this.$submit, bEnable);
	}
	
	// Загрузка данных формы из параметров УРЛа
	// Только для простых форм, не имеющих агрегирующих контроллеров.
	this.fromParams = function() {
		this.reset();	// Сброс всех полей
		// Предварительный вызов для всех контроллеров fromParam без параметра, чтобы контроллеры могли подготовиться...
		this.walk({
			ctrlBegin: function(ctrl) {
				if (ctrl.fromParam)
					ctrl.fromParam();
			}
		});
		var i, pair, name, value, list, ctrl,
			params = location.search,
			ctrls = this.ctrls;
		function decode(p) {
			// GET-запрос заменяет пробелы на плюсы
			return decodeURIComponent(p.replace(/\+/g, '%20'));
		}
		if (params[0]=='?') {
			list = params.slice(1).split('&');
			for (i in list) {
				pair = list[i].split('=');
				name = decode(pair[0]);
				value = decode(pair[1]);
				ctrl = ctrls[name];
				if (ctrl && ctrl.fromParam)
					ctrl.fromParam(value);
			}
		}
	}
} // FormBase
Rn.F.Base.prototype = RadonObject;

/**
 * Классическая форма. Предназначена для отправки данных на сервер классическим вызовом submit
 * Считается устаревшим вариантом, по сравнению с AJAX.
 */
Rn.F.Classic = function() {
	this.superClass = 'Base';
	this.onSubmit = function() {
		this.result = true;
	}
	this.onOpen = function() {
		if (this.from_params)
			this.fromParams();
	}
}

//==================================================================
//		Валидаторы
//==================================================================

Rn.V.Base = function() {
	this.ctrl = null;	// Контроллер-владелец. назначается при создании экземпляра
	this.msg = 'Invalid value';
	// Если значение прошло проверку, возвращается 0, false, undefined или пустая строка
	// Если ошибка зафиксирована, возвращается сообщение об ошибке
	this.check = function(value) {
	}
	this.walk = function(visitor) {
		if (visitor.validator)
			visitor.validator(this);
	}
}
Rn.V.Base.prototype = RadonObject;

// Проверка на непустое значение контроллера
Rn.V.NonEmpty = function() {
	this.superClass = 'Base';
	this.msg = Rn.V.NonEmpty.msg;
	this.check = function(value) {
		if (!value) return this.msg;
	}
}
Rn.V.NonEmpty.msg = 'Field must not be empty';

// Проверка значения с помощью регулярного выражения
Rn.V.Regexp = function() {
	this.superClass = 'Base';
	this.regexp = /\./;
	this.getRegexp = function() {
		return Rn.parseRegexp(this.regexp);
	}
	this.check = function(value) {
		return this.getRegexp().test(value) ? 0 : this.msg;
	}
}

// Целочисленное значение. Поле может быть пустым
Rn.V.Integer = function() {
	this.superClass = 'Base';
	this.msg = 'You must enter a integer value';
	var regexp = /^-{0,1}[\d]+$/;
	this.check = function(value) {
		if (value==='' && !this.required)
			return;
		if (!regexp.test(value))
			return this.msg;
	}
}

// Числовое значение, с ограничением снизу и сверху
Rn.V.Range = function() {
	this.superClass = 'Base';
	this.msg = Rn.V.Range.msg;
	this.msg_min = Rn.V.Range.msg_min;
	this.msg_max = Rn.V.Range.msg_max;
	this.check = function(value) {
		if (value === '')
			return;	// Не проверяем пустое значение, т.к. этим должен заниматься валидатор NonEmpty
		var value = +this.ctrl.val();
		if (isNaN(value))
			return this.msg;
		if (('min' in this) && value<this.min)
			return Rn.templText(this.msg_min, this);
		if (('max' in this) && value>this.max)
			return Rn.templText(this.msg_max, this);
	}
}
Rn.V.Range.msg = 'You must enter a numeric value';
Rn.V.Range.msg_min = 'The value should not be less than {{min}}';
Rn.V.Range.msg_max = 'The value must not be more than {{max}}';

// Контроль минимального количества символов в строке
Rn.V.MinLength = function() {
	this.count = 0;
	this.superClass = 'Base';
	this.check = function(value) {
		value += "";
		if (value.length < this.count) {
			return Rn.templText(this.msg, this);
		}
	}
}

// Контроль максимального количества символов в строке
Rn.V.MaxLength = function() {
	this.count = 0;
	this.superClass = 'Base';
	this.check = function(value) {
		value += "";	// Превратить в строку
		var count = this.count;
		if (count && value.length > count)
			return Rn.templText(this.msg, this);
	}
}

//==================================================================
//		Фильтры
//==================================================================

Rn.Filter.Base = function() {
	this.ctrl = 0;	// Контроллер-владелец
	// Переопределяемая функция фильтрации
	this.filter = function(dstObj) {
	}
	this.walk = function(visitor) {
		if (visitor.filter)
			visitor.filter(this);
	}
}
Rn.Filter.Base.prototype = RadonObject;

// Фильтр убирает значение, если оно пусто
Rn.Filter.NonEmpty = function() {
	this.superClass = 'Base';
	this.filter = function(dstObj) {
		var name = this.ctrl.name;
		if ((name in dstObj) && !dstObj[name])
			delete dstObj[name];
	}
}

// Переводит в числовой формат
Rn.Filter.Number = function() {
	this.superClass = 'Base';
	this.filter = function(dstObj) {
		var name = this.ctrl.name;
		if (name in dstObj) {
			dstObj[name] = +dstObj[name];
		}
	}
}
// Безусловное исключение данных контроллера
// Требуется для тех элементов, которые управляют внешним видом формы
// Например, чекбокс, который меняет видимость какой-то группы полей
Rn.Filter.Exclude = function() {
	this.superClass = 'Base';
	this.filter = function(dstObj) {
		// TODO: Временно считаем, что контроллер простой. Но нужна функция, возвращающая все данные контроллера
		delete dstObj[this.ctrl.name];
	}
}

// Замещать различные значения, соответсвующие логическому false, на null
Rn.Filter.Nullable = function() {
	this.superClass = 'Base';
	this.filter = function(dstObj) {
		// Считаем, что контроллер простоой
		var name = this.ctrl.name;
		if (!dstObj[name]) {
			dstObj[name] = null;
		}
	}
}

// Замещать или удалять все вхождения указанного регкспа
// Обязательный параметр regexp. Например data-regexp="/-/g" удаляет все знаки -
// Необязательный параметр to - строка для замены. По-умолчанию = пустая строка, что означает удаление
Rn.Filter.ReplaceRegexp = function() {
	this.to = '';
	this.superClass = 'Base';
	this.filter = function(dstObj) {
		var name = this.ctrl.name,
			value = dstObj[name],
			rx;
		if (typeof value == 'string') {
			rx = Rn.parseRegexp(this.regexp);
			if (rx) {
				dstObj[name] = value.replace(rx, this.to);
			}
		}
	}
}

//==================================================================
//		CtrlBase
//==================================================================
Rn.C.Base = function() {
	this.validators = [];	// Список валидаторов
	this.filters = [];		// Список фильтров
	this.$edit = null;		// DOM-элемент, выполняющий редактирование
	this.bDisabled = false;	// Признак того, что контроллер запрещён
	
	/**
	 * Обход содержимого.
	 * Переопределяется для сложных контроллеров, владеющих другими контроллерами.
	 * Базовый контроллер считается простым.
	 * @param {Object} visitor. Возможен вызов visitor.ctrlBegin(ctrl) и visitor.ctrlEnd(ctrl)
	 */
	this.walk = function(visitor) {
		if (visitor.ctrlBegin)
			visitor.ctrlBegin(this);
		var i, list=this.validators;
		for (i in list) {
			list[i].walk(visitor);
		}
		list = this.filters;
		for (i in list) {
			list[i].walk(visitor);
		}
		if (visitor.ctrlEnd)
			visitor.ctrlEnd(this);
	}

	/**
	 * Загрузка данных.
	 * Переопределяется наследниками, т.к. каждый тип контроллера может иметь собственный формат данных.
	 * @param {Object} srcObj	Объект, из которого контроллер пытается получить свои данные.
	 */
	this.load = function(srcObj) {
	}

	/**
	 * Сохранение даных контроллера. Переопределяется наследниками.
	 * @param {Object=} dstObj
	 * @param {boolean=} bSubmit
	 * @return {!Object}
	 */
	this.save = function(dstObj, bSubmit) {
		return dstObj || {};
	}
	
	// Фильтрация данных. По-умолчанию эту задачу решают внешние фильтры.
	this.filter = function(dstObj) {
		var i, filters = this.filters;
		for (i in filters) {
			filters[i].filter(dstObj);
		}
	}
	
	// Функция для получения простого значения
	this.val = function() {
		var j, a = [], obj = this.save();
		for (j in obj) a.push(obj[j]);
		return a.length==1 ? a[0] : obj;
	}
	
	this.reset = function() {
		Rn.reset(this);
	}
	this.open = function() {
	}
	
	/**
	 * Проверка контроллера.
	 * Если найдена ошибка, то нужно либо вернуть строковое сообщение, либо включить в errList структуру
	 * Структура информации об ошибке: { msg, ctrl }
	 * Стандартное поведение: последовательное обращение к валидаторам контроллера
	 */
	this.check = function(errList) {
		if (this.isVisible() && !this.bDisabled) {	// Проверяются только видимые и не запрещённые контроллеры
			var i, res, v, validators = this.validators,
				value = this.val();
			for (i in validators) {
				v = validators[i];
				res = v.check(value);
				if (res) return res;
			}
		}
	}

	/**
	 * Вычислить, является ли элемент обязательным для заполнения
	 * Для этого вызывается валидация пустой строки
	 * @return {boolean}
	 */
	this.isRequired = function() {
		var i, validators = this.validators;
		for (i in validators) {
			if (validators[i].check(''))
				return true;
		}
		return false;
	}
	
	/**
	 * Установить (или снять) визуальный признак того, что элемент обязателен для заполнения
	 * Автоматически вызывается после каждого onUpdate
	 */
	var prevRequired;
	this.makeRequired = function(bRequired) {
		bRequired = bRequired===undefined ?  this.isRequired() : !!bRequired;
		if (bRequired !== prevRequired) {
			this.$def.toggleClass(Rn.p.clsRequired, prevRequired = bRequired);
		}
	}
	
	// Отображение наличия или отсутствия ошибки. Если ошибки нет, msg=0. Иначе - строка.
	this.onError = function(msg) {
		// Стандартное отображение ошибки предполагает централизованный механизм.
		this.form.onCtrlError(this, msg);
	}
	
	/**
	 * Оповещение об обновлении состоянии контроллера.
	 * Может вызвать onUpdate у всех объектов страницы, если контроллер на текущей странице.
	 */
	this.update = function() {
		var ownerPage = this.form.page;
		if (ownerPage==Rn.curPage()) {
			Rn.update();
		}
	}
	
	/**
	 * Генерация содержимого контроллера
	 * Функция часто переопределяется в наследниках, но не вызывается напрямую.
	 */
	this.render = function() {
		// нельзя вызывать onReset, т.к. ещё не инициализированы интерфейсные элементы
		var tmId = Rn.findTm(this, 'Ctrl');
		return Rn.tm(tmId, this, this.$def, 1);
	}
	
	var bVisible= 1;
	
	/**
	 * Показать или скрыть контроллер
	 * @param {boolean=} bOn	1/true/undefined - показать, 0/false-скрыть. Undefined приравнивается к 1, т.к. show() логично трактовать как "показать" а не скрыть.
	 */
	this.show = function(bOn) {
		if (bOn === undefined) bOn=1;
		// Пока что единственный плюс использования внутренней переменной перед is(:visible) в скорости
		if (bOn ^ bVisible) {	// если новое значение отличается от старого...
			this.$def.toggle(bVisible = !!bOn);
			this.update();
		}
	}

	/**
	 * Проверка видимости контроллера
	 * @return {boolean}
	 */
	this.isVisible = function() {
		return !!bVisible;
	}

	/**
	 * Запретить или разрешить контроллер.
	 * Стандартная реализация предполагает наличие поля $edit
	 * Для тех контроллеров, которые им не пользуются, нужно переопределить данную функцию
	 * @param {boolean} bOn
	 */
	this.enable = function(bOn) {
		var bDisabled = !bOn;
		if (this.bDisabled !== bDisabled) {
			this.bDisabled = bDisabled;
			if (this.$edit) {
				Rn.enable(this.$edit, bOn);
			}
			// Класс clsDisabledBox для внешнего контейнера
			this.$def.toggleClass(Rn.p.clsDisabledBox, bDisabled);
		}
	}
	
	/**
	 * Установить фокус на контроллер.
	 */
	this.focus = function() {
		(this.$edit ? this.$edit : this.$def).focus();
	}
	
	// Отобразить значения контроллера в ДОМ-элементах, принадлежащих контроллеру.
	this.val2dom = function() {
	}
	
	// Считать значения из ДОМ-элементов и сохранить в объекте контроллера
	// Эта функция должна принадлежать только определённым контроллерам и вызывается только внутри render()
	// В редких случаях возможно применение напрямую. Например, Хром подставляет пароль в форму авторизации, не вызывая события об изменении.
	// В этом случае можно вызвать dom2val, чтобы перенести полученный пароль в контроллер. Но после этого не забываем вызывать Rn.update()
	this.dom2val = function() {
	}
}
Rn.C.Base.prototype = RadonObject;

//==================================================================
//		CtrlGroup
//==================================================================
Rn.C.Group = function() {
	this.superClass = 'Base';
	this.ctrls = {};	// подчинённые контроллеры:	имя =>контроллер
	
	this.walk = function(visitor) {
		if (visitor.ctrlBegin)
			visitor.ctrlBegin(this);
		for (var name in this.ctrls) {
			if (visitor.result)
				break;
			this.ctrls[name].walk(visitor);
		}
		if (visitor.ctrlEnd)
			visitor.ctrlEnd(this);
	}
	
	this.save = function(dstObj, bSubmit) {
		dstObj = dstObj || {};
		this.saveItems(dstObj[this.name] = {}, bSubmit);
		return dstObj;
	}
	
	this.saveItems = function(subObj, bSubmit) {
		var name, ctrls = this.ctrls;
		for (name in ctrls) {
			Rn.saveCtrl(ctrls[name], subObj, bSubmit);
		}
	}
	
	/**
	 * Загрузка данных.
	 * @param {Object} srcObj	Если в объекте есть вложенный объект с ключом, соответствующим имени контроллера, 
	 *     то подобъект передаётся для загрузки подчинённым контроллерам.
	 */
	this.load = function(srcObj) {
		if (typeof srcObj == 'object' && (this.name in srcObj)) {
			var subObj = srcObj[this.name], name, ctrls = this.ctrls;
			if (typeof subObj == 'object') {
				for (name in ctrls) {
					ctrls[name].load(subObj);
				}
			}
		}
	}
	
	/**
	 * Добавление подчинённого контроллера.
	 * Метод типичный для контроллеров-контейнеров
	 */
	this.addCtrl = function(subCtrl) {
		this.ctrls[subCtrl.name] = subCtrl;
	}
	this.render = function() {
	}
} // CtrlGroup

//====================================================================================
//	CtrlValue
//	Представляет в структуре данных простое значение (строка, число или бул).
//	Не используется напрямую, а является предком для большинства простых контроллеров
//	Существует два направления для воздействия на значение:
//	- значение меняется скриптом, в этом случае нужно обновить DOM-элемент => setValue
//	- значение меняется DOM-элементом => fromDOM
// Необходимо переопределить функции render, val2dom, dom2val
// Функции load, save, onReset переопределять не нужно.
// Скелет типичного наследника:
// function CtrlMyValue = function() {
//		this.superClass = 'Value';
//		this.value = this.value0 = '';
//		var $domElement = null;
//		this.render = function() {
//			var ctrl = this;
//			ctrl.Value_render();
//			$domElement = $('.some-selector', ctrl.$def);
//			Rn.setTextHandler($domElement, function(){
//				ctrl.fromDOM(); });
//			ctrl.val2dom();
//		}
//		this.dom2val = function() {
//			this.value = $domElement.val(); }
//		this.val2dom = function() {
//			$domElement.val(this.value); }
//====================================================================================
Rn.C.Value = function() {
	this.superClass = 'Base';
	this.value = null;	// Извне это свойство можно только читать.
		// Каждый наследник должен определить свой тип данных, н.р. this.value = '';
		
	function notImpl(ctrl, funcName) {
		throw new Error('Function "'+funcName+'" not implemented for '+ctrl.type+' controller');
	}
	
	// низкоуровневые функции синхронизации
	// Эта функция может быть вызвана системой в тех случаях, когда нужно привести элементы страницы в актуальное состояние
	// Но основное её назначение - для правильной работы setValue
	this.val2dom = function() {
		var $edit = this.$edit;
		if ($edit) {
			$edit.val(this.value);
		} else {
			// Реализация зависит от особенностей контроллера
			notImpl(this, 'val2dom');
		}
	}
	this.dom2val = function() {
		var $edit = this.$edit;
		if ($edit) {
			this.value = $edit.val();
		} else {
			// Реализация зависит от особенностей контроллера
			notImpl(this, 'dom2val');
		}
	}
	
	// Переопределение функции базового класса
	this.render = function() {
		this.value = this.value0;
		this.Base_render();
	}
	
	/**
	 * Вызывается в тех случаях, когда зафиксированы изменения в DOM-элементе контроллера для синхронизации с внутренним значением
	 * Может вызвать onUpdate
	 */
	this.fromDOM = function() {
		var result= 0, oldValue = this.value;
		this.dom2val();
		// здесь можно немного сэкономить, если не вызывать update всех контроллеров
		if (oldValue!==this.value) {
			this.update();
			result = 1;
		}
		return result;
	}
	
	// Метод для загрузки данных из параметров урла
	this.fromParam = function(value) {
		if (value!==undefined)
			this.setValue(value);
	}

	/**
	 * Назначить новое значение контроллера из скрипта (но не в случае изменения DOM-элемента)
	 * При этом обновится внешний вид контроллера и будет выполнена проверка всех форм страницы.
	 */
	this.setValue = function(newValue) {
		// чтобы код работал эффективно, не следует лишний раз обращаться к DOM
		// для этого сравниваем новое и старое значение
		// если значение не меняется, то можно значительно сэкономить
		if (newValue!=this.value) {
			this.value = newValue;
			this.val2dom();
			this.update();
		}
	}

	// Эффективнее читать напрямую свойство value
	// Но раз есть setValue, то должно быть и getValue
	this.getValue = function() {
		return this.value;
	}

	/**
	 * Сохранение данных
	 * @param {Object=} dstObj
	 * @param {boolean=} bSubmit
	 */
	this.save = function(dstObj, bSubmit) {
		dstObj = dstObj || {};
		dstObj[this.name] = this.value;
		return dstObj;
	}
	
	/**
	 * Загрузка данных
	 * @param {Object} srcObj	Загружает строковое значение из srcObj по ключу, равному имени контроллера
	 */
	this.load = function(srcObj) {
		if (srcObj && this.name in srcObj) {
			//this.setValue(srcObj[this.name]+""); TODO: почему-то раньше использовалось строковое значение
			// Но например, для Checkbox это даёт ошибку, т.к. он использует булево значение
			this.setValue(srcObj[this.name]);
		}
	}
	
	this.onReset = function() {
		this.setValue(this.value0);
	}
}


//==================================================================
//		CtrlString
//==================================================================
Rn.C.String = function() {
	this.superClass = 'Value';
	this.input_type = 'text'; // <input type="text" />
	
	this.value = this.value0 = '';	// Значение по-умолчанию, которое используется при сбросе объекта.

	/**
	 * переопределение функции render базового класса.
	 */
	this.render = function() {
		var ctrl=this;
		ctrl.Value_render();
		var $input = ctrl.$edit = $('input', ctrl.$def);
		ctrl.val2dom();	// Вывести значение контроллера в DOM-элемент.
		// Отловить изменения
		Rn.setTextHandler($input, function(){
			ctrl.fromDOM();
		});
	}

	this.setValue = function (value) {
		return this.Value_setValue(value+'');	// Обязательное приведение к строке. Иначе числовой 0 трактуется как пустая строка валидатором NonEmpty
	}

} // end of CtrlString


// Контроллер для ввода пароля
Rn.C.Password = function() {
	this.superClass = 'String';
	this.input_type = 'password';
}

//===========================================
//		Checkbox controller
//  так как велика вероятность, что разработчики будут ошибаться
//===========================================

Rn.C.Checkbox = function() {
	this.superClass = 'Value';
	this.value = this.value0 = false;

	this.setValue = function(value) {
		if (typeof value=='string') {
			value = !(!value || value=='0' || value=='false');
		} else {
			value = !!value;
		}
		return this.Value_setValue(value);
	}
	
	this.val2dom = function() {
		this.$edit.prop('checked', !!this.value);
	}
	this.dom2val = function() {
		this.value = this.$edit.is(':checked');
	}
	
	this.render = function() {
		var ctrl = this;
		ctrl.Value_render();
		var v0 = ctrl.value0;
		if (typeof v0 == 'boolean')
			value = v0;
		else if (typeof v0 == 'string') {
			if (v0=='true')
				value = true;
			else if (v0=='false')
				value = false;
		}
		ctrl.$edit = $('input', ctrl.$def).change(function(){
			ctrl.fromDOM();
		});
		ctrl.val2dom();
	}
	
	this.fromParam = function(value) {
		this.setValue(!!value);
	}
}


/********************************************************
	Контроллер, объединяющий группу других контроллеров
	С точки зрения данных, это массив
	data-item_tm - шаблон для элемента массива. В нём .j-item-del служит для удаления элемента
	data-msg_add - текст кнопки для добавления элемента
	.rn-array - контейнер для элементов массива
	.rn-add-item - кнопка добавления
	
	data-min, data-max - Необяз. ограничение на количество элементов
	
	+---------------------------------+
	|          CtrlArray              |
	+---------------------------------+
	     |      +-------------------+
	     +----->| Item 0, CtrlCroup |
	            +-------------------+
	
*********************************************************/
Rn.C.Array = function() {
	this.superClass = 'Base';
	this.items = [];	// Элементы массива, каждый из которых является контроллером типа Group
	this.$array = null;	// jQ-Контейнер для элементов
	this.$add = null;	// Кнопка добавления нового элемента
	this.render = function() {
		var ctrl = this;
		ctrl.Base_render();
		ctrl.$array = $(Rn.p.clsArrayBox, ctrl.$def);	// DOM-контейнер для элементов массива
		ctrl.$add = $(Rn.p.clsArrayAdd, ctrl.$def).click(function(){
			if (!Rn.isDisabled(this))
				ctrl.addItem();
			return false;
		});
		ctrl.onReset();	// Здесь производится контроль минимального числа элементов
	}

	this.walk = function(visitor) {
		if (visitor.ctrlBegin)
			visitor.ctrlBegin(this);
		var i, name, item;
		for (i in this.items) {
			item = this.items[i];	// элемент массива, контроллер Group
			item.walk(visitor);
		}
		if (visitor.ctrlEnd)
			visitor.ctrlEnd(this);
	}
	
	this.save = function(dstObj, bSubmit) {
		dstObj = dstObj || {};
		var i, name, item, node, list=[], subObj;
		dstObj[this.name] = list;
		for (i in this.items) {
			item = this.items[i];	// Элемент массива, контроллер Group
			list.push(subObj = {});
			item.saveItems(subObj, bSubmit);
		}
		return dstObj;
	}
	
	this.load = function(srcObj) {
		if (typeof srcObj != 'object' || !(this.name in srcObj))
			return;
		this.clear();
		var i, name, item, dataNode, srcObjItems=srcObj[this.name];
		for (i in srcObjItems) {
			dataNode = srcObjItems[i];
			this.addItem(dataNode);
			item = this.items[this.items.length-1];
			for (name in item.ctrls) {
				item.ctrls[name].load(dataNode);
			}
		}
	}
	// Функция, вызываемая из Rn.createCtrl
	this.addCtrl = function(ctrl) {
		// Ничего не делаем, т.к. добавление происходит в CtrlArray.addItem: ctrl.items.push(groupCtrl)
	}

	/**
	 * При генерации шаблона могут понадобиться параметры
	 * @param {int} i
	 * @return {Object=} Параметры для i-го элемента
	 */
	this.getItemParams = function(i) {}
	
	/**
	 * Добавление нового элемента в конец массива
	 */
	this.addItem = function(srcParams) {
		// Не добавлять больше, чем разрешено
		var tm, ctrl=this, nMax = this.getMax();
		if (nMax && ctrl.items.length >= nMax)
			return 0;
		
		// Создать DOM-элемент, описатель контроллела элемента массива
		tm = ctrl.item_tm;
		if (!tm)
			throw new Error('Item template is not specified for '+ctrl.name);
		var tmParams = ctrl.getItemParams(ctrl.items.length) || srcParams;
		var $group = Rn.tm(tm, tmParams, ctrl.$array);

		// Кнопка удаления элемента. Поиск происходит до создания подчинённых контроллеров, у которых могут быть свои кнопки удаления
		var $del = $(Rn.p.clsArrayDel, $group);
		
		// Создать контроллер группы. Его особенность в том, что у него может не быть никаких data-xxxx
		// name не используется, type = Group, если не указано иное
		$group.data('type', $group.data('type') || 'Group').addClass(Rn.p.clsCtrl);
		var groupCtrl = lastItem = Rn.createCtrl($group, ctrl.form, ctrl);
		groupCtrl.owner = ctrl;
		ctrl.items.push(groupCtrl);
		
		Rn.initCtrls(ctrl.form, $group, groupCtrl);
		
		// Дополнительная функция для определения индекса элемента
		groupCtrl.getIndex = function() {
			return ctrl.$array.children().index($group);
		}
		// Разрешить/запретить кнопки удаления элемента
		groupCtrl._onUpdate = groupCtrl.onUpdate;
		groupCtrl.onUpdate = function() {
			groupCtrl._onUpdate();
			var nMin = ctrl.getMin();
			if (nMin)
				Rn.enable($del, ctrl.items.length > nMin);
		}
		// Обработчик клика на кнопку удаления элемента
		$del.click(function(ev){
			if (!Rn.isDisabled(this)) {
				ctrl.delItem( groupCtrl.getIndex() );
			}
			return false;
		});
		
		ctrl.update();
		return groupCtrl;
	}
	
	/**
	 * Удаление указанного элемента массива
	 * @param {number} index	Индекс удаляемого элемента
	 */
	this.delItem = function(index) {
		var ctrl = this;
		ctrl.items.splice(index, 1);
		ctrl.$array.children().eq(index).remove();
		ctrl.update();
	}

	this.clear = function() {
		this.$array.empty();
		this.items.length = 0;
		this.update();
	}
	
	this.onReset = function() {
		this.clear();
		var nMin = this.getMin();
		if (nMin) {
			while (this.items.length<nMin) {
				this.addItem();
			}
		}
	}
	
	this.onUpdate = function() {
		// Проверка на макс. значение
		var nMax = this.getMax();
		// Запретить кнопку добавления, если число элементов достигло максимума
		if (nMax) Rn.enable(this.$add, this.items.length<nMax);
		
		// Проверка на минимальное значение производится внутри контроллеров Group
	}
	
	// Минимальное количество элементов в массиве. Если undefined, значит 0
	this.getMin = function() {
		var m = this.min;
		if (m) m=+m;
		return m;
	}
	// Максимальное количество элементов. Если 0 или undefined, значит нет ограничений
	this.getMax = function() {
		var m = this.max;
		if (m) m=+m;
		return m;
	}
}

/*************************************************
 Droplist controller
**************************************************/
Rn.C.Droplist = function() {
	this.superClass = 'Value';
	this.value = this.value0 = '';
	
	this.render = function() {
		var ctrl = this;
		ctrl.Value_render();
		ctrl.$edit = $('select', ctrl.$def).change(function(){
			ctrl.fromDOM();
		});
		ctrl.buildList();
	}
	this.isValidOption = function(value, label, defNode) {
		return true;
	}
	
	this.createOption = function(value, label, defNode) {
		return $('<option>').val(value).text(label).appendTo(this.$edit);
	}
	
	/**
	 * Заполнить список (свойство $sel)
	 * @throws {Error}
	 */
	this.buildList = function() {
		// стандартный Droplist использует шаблон, указанный свойством options, либо скриптовый массив в глобальной области видимости
		var ctrl = this, sel = ctrl.$edit.empty();
		Rn.buildList(ctrl, function(value, label, defNode){
			if (ctrl.isValidOption(value, label, defNode))
				ctrl.createOption(value, label, defNode);
		});
		ctrl.val2dom();
	}
}
/**
 * Статическая функция для формирования списков
 * @param {Object} ctrl	Объект, имеющий поле options и возможно option_value и option_label
 */
Rn.buildList = function(ctrl, callbk) {
	var options = ctrl.options;
	if (!options)
		throw new Error('Expected "options" field for controller with name='+ctrl.name);
	function enumObject(list) {
		var key, item,
			valueKey = ctrl.option_value || 'value',
			labelKey = ctrl.option_label || 'label';
		function field(name) {
			if (name=='@')
				return key;
			if (name=='#')
				return item;
			return item[name];
		}
		for (key in list) {
			item = list[key];
			callbk(field(valueKey), field(labelKey), item);
		}
	}
	// Возможен вариант, когда options сразу является объектом
	if (typeof options == 'object') {
		enumObject(options);
	} else {
		// Затем ищем элемент с указанным идентификатором
		var $sel = $('#'+options);
		if ($sel.length == 1) {
			// Генерация списка из dom-элемента
			$sel.children().each(function(){
				var $opt = $(this);
				callbk($opt.val(), $opt.text(), $opt);
			});
		} else if (options in window) {
			// Указана переменная в глобальной области видимости
			enumObject(window[options]);
		} else {
			throw new Error('Invalid Droplist list "'+options+'" in "'+ctrl.name+'" controller');
		}
	}
}

//**************************************************
// Контроллер радиокнопок
// Radiobox и RadioBox - синонимы для удобства разработчика
// По функционалу похож на Droplist
//**************************************************
Rn.unique = 0;
Rn.C.Radiobox = Rn.C.RadioBox = function() {
	this.superClass = 'Value';
	this.$rbox = null;
	this.value = this.value0 = '';
	this.unique = Rn.unique++;	// Уникальный индекс данного экземпляра. Необходим для формирования имени элемента :radio
	
	this.val2dom = function() {
		var ctrlVal = this.value;
		// Пройти по всем радио-элементам и выставить свойство checked, в зависимости от атри
		$(':radio', this.$rbox).each(function(){
			var radioItem = $(this), itemVal = radioItem.val();
			radioItem.prop('checked', itemVal==ctrlVal);
		});
	}
	
	this.dom2val = function() {
		// Найти отмеченный элемент и считать его значение
		var radioItem = $(':checked', this.$rbox);
		if (radioItem.length==1) {	// Должен быть отмечен один элемент
			this.value = radioItem.val();
		}
	}
	
	this.render = function() {
		var ctrl = this;
		ctrl.Value_render();
		ctrl.$rbox = $('.rn-radiobox', ctrl.$def);
		ctrl.buildList();
	}
	
	this.isValidOption = function(value, label) {
		return true;
	}
	
	this.createOption = function(value, label, itemDef) {
		var ctrl = this, radioTm = ctrl.radio_tm;
		if (!Rn.hasTm(radioTm))
			throw new Error('Invalid property "radio_tm" for "'+ctrl.name+'" controller');
		var	item, opt = {};
		if ($.isPlainObject(itemDef))
			$.extend(opt, itemDef);
		$.extend(opt, ctrl, {value:value, label:label, unique:this.unique});
		// Создать вариант и зарегистрировать в боксе
		item = Rn.tm(radioTm, opt, ctrl.$rbox);
		// Повесить обработчик события change на радиоэлемент, который находится внутри варианта
		var radio = $(':radio',item);
		radio.change(function(){
			if (radio.is(':checked')) {
				ctrl.fromDOM();
			}
		});
	}
	
	this.buildList = function() {
		var ctrl = this;
		ctrl.$rbox.empty();
		Rn.buildList(ctrl, function(value, label, itemDef){
			if (ctrl.isValidOption(value, label))
				ctrl.createOption(value, label, itemDef);
		});
		ctrl.val2dom();
	}
	
	this.buildListOld = function() {
		var ctrl = this, radioTm = ctrl.radio_tm;
		if (!Rn.hasTm(radioTm))
			throw new Error('Invalid property "radio_tm" for "'+ctrl.name+'" controller');
		ctrl.$rbox.empty();
		// Пока используем только массив
		var optSourceName = ctrl.options;
		if (optSourceName in window) {
			// Массив с элементами { value, label }
			var key, list=window[optSourceName];
			for (key in list) addOption(list, key);
			function addOption(list, key) {
				var opt = ctrl.parseOption(list, key);
			}
		} else {
			throw new Error('Invalid Radiobox list "'+optSourceName+'" in "'+ctrl.name+'" controller');
		}
		ctrl.val2dom();
	}
	this.parseOption = function(list, key) {
		// Пока что подразумевается, что список состоит из элементов {value, label}
		return list[key];
	}
}

//=================================================
//		CtrlText
//=================================================
Rn.C.Text = function() {
	this.superClass = 'String';
	this.rows = 3;
	this.cols = 60;
	this.render = function() {
		var ctrl = this;
		ctrl.Base_render();
		Rn.setTextHandler(ctrl.$edit = $('textarea', ctrl.$def), function(){
			ctrl.fromDOM();
		});
		ctrl.val2dom();	// Вывести значение контроллера в DOM-элемент.
	}
}

//===========================
// CtrlHidden - Невидимый контроллер
// Не требует шаблона
//===========================
Rn.C.Hidden = function() {
	this.superClass = 'Value';
	this.render = function() {
		var ctrl = this;
		ctrl.$edit = $('<input/>').attr({type:'hidden', name:ctrl.name});
		ctrl.value = ctrl.value0;
		ctrl.val2dom();
	}
}
