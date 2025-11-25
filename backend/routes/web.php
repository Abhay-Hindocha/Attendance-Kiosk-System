<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Response;

Route::get('/', function () {
    return view('welcome');
});

// Fallback route to serve React frontend for all non-API routes
Route::get('/{any}', function () {
    $path = public_path('index.html');

    if (!File::exists($path)) {
        abort(404, 'Frontend application not found. Please build and copy it to public directory.');
    }

    $content = File::get($path);
    return Response::make($content, 200, [
        'Content-Type' => 'text/html',
    ]);
})->where('any', '^(?!api).*$');
