// Запуск локального сервера для имитации внутреннего сайта

const path = require('path');
const http = require('http');
const url = require('url');
const express = require('express');

const app = express()
const htmlHeaders = {
	charset: 'utf-8',
	'Access-Control-Allow-Origin': '*',
}

const server = http.createServer(app)
app.get('/xc/:name', (request, response) => {
	for (key in htmlHeaders) {
		response.setHeader(key, htmlHeaders[key]);
	}
	const fileName = path.join(__dirname, 'internal', request.params.name);
	response.sendFile(fileName);
});

server.listen(2999, () => {
	console.log('Internal server starts localhost:2999')
});
