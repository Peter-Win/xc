
var _xcMethods = {
	byCost: 'Расчет по стоимости жилья',
	byIncome: 'Расчет по доходу',
};
var _xcMonthlyIncomes = [
	{value: 'good', label: 'Справкой о доходах/налоговой декларацией'},
	{value: 'bad', label: 'Без подтверждения',
		help: 'В этом случае заявка рассматривается по 2 документам, процентная ставка увеличивается на 0,5 п.п.'}
];

!function () {
	// Преобразовать число в строку с пробелом через 3 разряда. И 2 цифрами после точки.
	function moneyFmt(x) {
		var n = Math.floor(x);
		var s = n.toString();
		i = s.length-3;
		while (i>0) {
			s = s.substring(0,i)+'&nbsp;'+s.substring(i);
			i-=3;
		}
		// Копейки, если есть
		if (x-n >= 0.01) {
			s+=(x-n).toFixed(2).substring(1);
		}
		return s;
	}

	Rn.F.Calc = function () {
		this.superClass = 'Base';
		this.onPostUpdate = function () {
			var form = this, ctrls = form.ctrls, $def = form.$def;
			var $calcResults = form._cr = form._cr || $('.xc-calc-results', $def);
			var $childBox = form._cb = form._cb || $('.xc-child-box', $def);
			var data = form.save(0, 1);
			$childBox.toggle(!data.useMother);
			if (!form.ok) {
				data = {bErrors: true};
			} else {
				var method = ctrls.method.getValue();
				var isByCost = method === 'byCost';
				var isByIncome = method === 'byIncome';
				ctrls.cost.show(isByCost);
				ctrls.useMother.show(isByCost);
				ctrls.monthlyIncome.show(isByIncome);
				data.programStr = _xcMethods[method];
				data.isByCost = isByCost;
				data.isByIncome = isByIncome;
				data.costFmt = moneyFmt(data.cost);
				data.monthlyIncomeFmt = moneyFmt(data.monthlyIncome);
			}
			Rn.tm('TmCalcResults', data, $calcResults, 1);
		}
	}

	Rn.C.NumSlider = function () {
		this.superClass = 'String';
		var $slider, sliderWidth,
			$tracker, trackerWidth,
			$used,
			screenWidth = 0;
		this.$slider = 0;
		this.msg = g_Lang.sliderMsg;
		this.msg_min = g_Lang.sliderMin;
		this.msg_max = g_Lang.sliderMax;
		this.min = this.value0 = 0;
		this.max = 100;
		function getRange(ctrl) {
			var range = {a:+ctrl.min, b:+ctrl.max};
			range.w = range.b - range.a;
			return range;
		}
		function bound(range, value) {
			return Math.max(Math.min(value, range.b), range.a);
		}
		function world2screen(ctrl, value) {
			var range = getRange(ctrl);
			if (range.w && $tracker) {
				var dx = (bound(range, value)-range.a) * screenWidth / range.w;
				$tracker.css('left', dx);
				$used.css('width', dx);
			}
		}
		function screen2world(ctrl, pos) {
			var range = getRange(ctrl);
			if (screenWidth && $tracker) {
				var worldValue = bound(range, Math.round(pos * range.w / screenWidth + range.a));
				var r = ctrl.round;
				if (r) {
					worldValue = Math.round(worldValue / r) * r;
				}
				ctrl.$edit.val(worldValue);
				ctrl.fromDOM();
				$tracker.css('left', bound({a:0, b:screenWidth}, pos));
			}
		}
		this.render = function() {
			var ctrl = this;
			ctrl.String_render();
			if (ctrl.round) {
				ctrl.round = +ctrl.round;
			}
			ctrl.$slider = $slider = $('.xc-slider-box', ctrl.$def);
			$tracker = $('.xc-slider-tracker', $slider);
			$used = $('.xc-slider-used', $slider);
			sliderWidth = $slider.outerWidth();
			trackerWidth = $tracker.outerWidth();
			screenWidth = sliderWidth - trackerWidth;
			var state=0, trackX;
			function calcScreenPos(ev) {
				return ev.pageX - trackX - $slider.offset().left;
			}
			// --- мышиный обработчик для компьютеров
			$tracker.mousedown(function(ev){
				state=1;
				trackX = ev.pageX - $tracker.offset().left;
			});
			$(window).mouseup(function(ev) {
				state=0;
				world2screen(ctrl, ctrl.value);
			}).mousemove(function(ev){
				if (!state) return;
				screen2world(ctrl, calcScreenPos(ev));
				ev.preventDefault();
			});
			// ===== Обработчик касания для мобильных устройств
			$tracker.bind('touchstart', function (ev) {
				ev.preventDefault();
				var touches = ev.originalEvent.changedTouches;
				trackX = touches[0].pageX - $tracker.offset().left;
			}).bind('touchmove', function (ev) {
				ev.preventDefault();
				var touches = ev.originalEvent.changedTouches;
				screen2world(ctrl, calcScreenPos(touches[0]));
			});

			world2screen(this, this.value);
			// Вывод легенды
			var legendCount = +ctrl.legend;
			if (legendCount) {
				var i, $legend = $('.xc-legend', ctrl.$def),
					a = ctrl.min, w = ctrl.max - a,
					n = legendCount - 1,
					itemWidth = Math.round(100 / legendCount)+'%';
				for (i = 0; i <= n; i++) {
					var $item = $('<div>').addClass('xc-legend-item').appendTo($legend);
					if (i == 0) $item.addClass('xc-first');
					else if (i == n) $item.addClass('xc-last');
					$item.text(this.makeLegend(a + w * i / n));
					$item.css({width: itemWidth});
				}
			}
		}
		this.isRequired = function() {
			return !!this.required;
		}
		this.check = function(errList) {
			var val = this.value;
			if (!/^-?\d+$/.test(val))
				return this.msg;
			if (val < this.min)
				return Rn.templText(this.msg_min, this);
			if (val > this.max)
				return Rn.templText(this.msg_max, this);
			return this.String_check(errList);
		}
		this.val2dom = function() {
			this.String_val2dom();
			world2screen(this, this.value);
		}
		this.dom2val = function() {
			this.String_dom2val();
			world2screen(this, this.value);
		}
		this.validValue = function() {
			return Math.max( Math.min(this.value || 0, +this.max), +this.min);
		}
		this.makeLegend = function (value) {
			value = +value;
			if (Math.abs(value) < 1000)
				return Math.round(value);
			value /= 1000;
			if (Math.abs(value) < 1000)
				return Math.round(value) + ' тыс.';
			return Math.round(value / 1000) + ' млн.';
		}
	}
	// Сообщения об ошибках
	var g_Lang = {
		sliderMsg: "Необходимо ввести целое число",
		sliderMin: "Значение не должно быть меньше {{min}}",
		sliderMax: "Значение не должно быть больше {{max}}"
	};
}();
