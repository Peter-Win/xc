
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
			var data;
			var form = this, ctrls = form.ctrls;
			var $calcResults = form._cr = form._cr || $('.xc-calc-results', form.$def);
			if (!form.ok) {
				data = {bErrors: true};
			} else {
				var method = ctrls.method.getValue();
				var isByCost = method === 'byCost';
				var isByIncome = method === 'byIncome';
				ctrls.cost.show(isByCost);
				ctrls.useMother.show(isByCost);
				ctrls.monthlyIncome.show(isByIncome);
				var data = form.save(0, 1);
				data.programStr = _xcMethods[method];
				data.isByCost = isByCost;
				data.isByIncome = isByIncome;
				data.costFmt = moneyFmt(data.cost);
				data.monthlyIncomeFmt = moneyFmt(data.monthlyIncome);
			}
			Rn.tm('TmCalcResults', data, $calcResults, 1);
		}
	}

}();
