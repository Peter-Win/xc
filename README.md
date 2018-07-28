# xc
Externat Calculator

Для внешних пользователей поставляется инструкция:
- Добавить в код страницы &lt;script src="[path]/xc/main.js"&gt;&lt;/script&gt;
- Добавить &lt;link rel="styleSheet" type="text/css" href="[path]/xc/main.css"/&gt;
- Добавить в требуемое место &lt;div id="SomeIdForXC"&gt;&lt;/div&gt;
- Добавить скрипт 
&lt;script&gt;
  _$xc.init('SomeIdForXC');
&lt;/script&gt;
