<?php

use App\Modules\DrugLookups\Controllers\DosageFormController;
use App\Modules\DrugLookups\Controllers\DrugCategoryController;

/** @var \App\Core\Router $router */

foreach (['/dosage-forms' => DosageFormController::class, '/drug-categories' => DrugCategoryController::class] as $path => $controller) {
    $router->get($path, [$controller, 'index'], [
        AuthMiddleware::class,
        [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
    ]);

    $router->post($path, [$controller, 'register'], [
        AuthMiddleware::class,
        [RoleMiddleware::class, ['admin']]
    ]);

    $router->put($path, [$controller, 'update'], [
        AuthMiddleware::class,
        [RoleMiddleware::class, ['admin']]
    ]);

    $router->delete($path, [$controller, 'destroy'], [
        AuthMiddleware::class,
        [RoleMiddleware::class, ['admin']]
    ]);
}
