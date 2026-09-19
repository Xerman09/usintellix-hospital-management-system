<?php

namespace App\Core;

class Router
{
    private array $routes = [];

    /**
     * Register a GET route.
     */
    public function get(string $uri, callable|array $action, array $middleware = []): void
    {
        $this->addRoute('GET', $uri, $action, $middleware);
    }

    /**
     * Register a POST route.
     */
    public function post(string $uri, callable|array $action, array $middleware = []): void
    {
        $this->addRoute('POST', $uri, $action, $middleware);
    }

    /**
     * Register a DELETE route.
     */
    public function delete(string $uri, callable|array $action, array $middleware = []): void
    {
        $this->addRoute('DELETE', $uri, $action, $middleware);
    }

    /**
     * Register a PUT route.
     */
    public function put(string $uri, callable|array $action, array $middleware = []): void
    {
        $this->addRoute('PUT', $uri, $action, $middleware);
    }

    /**
     * Register a route.
     */
    private function addRoute(string $method, string $uri, callable|array $action, array $middleware = []): void
    {
        $this->routes[$method][$this->normalize($uri)] = [
            'action' => $action,
            'middleware' => $middleware,
        ];
    }

    /**
     * Dispatch the current request.
     */
    public function dispatch(string $method, string $uri): void
    {
        $uri = $this->normalize($uri);

        if (!isset($this->routes[$method][$uri])) {
            http_response_code(404);

            echo json_encode([
                'success' => false,
                'message' => 'Route not found.'
            ]);

            return;
        }

        $route = $this->routes[$method][$uri];
        $action = $route['action'];
        $middleware = $route['middleware'] ?? [];

        foreach ($middleware as $entry) {
            if (!$this->runMiddleware($entry)) {
                if (http_response_code() === 200) {
                    http_response_code(403);
                    header('Content-Type: application/json');
                    echo json_encode([
                        'success' => false,
                        'message' => 'Access denied.'
                    ]);
                }
                return;
            }
        }

        // Closure route
        if (is_callable($action)) {
            $action();
            return;
        }

        // Controller route
        [$controller, $methodName] = $action;

        $instance = new $controller();

        $instance->$methodName();
    }

    /**
     * Run a middleware entry.
     */
    private function runMiddleware(mixed $middleware): bool
    {
        if (is_callable($middleware)) {
            return (bool) $middleware();
        }

        if (is_array($middleware)) {
            $class = $middleware[0] ?? null;
            $args = array_slice($middleware, 1);

            if (is_string($class)) {
                if (!class_exists($class)) {
                    $basename = basename(str_replace('\\', '/', $class));
                    $file = dirname(__DIR__) . '/Middleware/' . $basename . '.php';

                    if (file_exists($file)) {
                        require_once $file;
                    }

                    if (!class_exists($class) && class_exists($basename)) {
                        $class = $basename;
                    }
                }

                if (!class_exists($class)) {
                    error_log("Middleware class not found: {$class}");
                    return false;
                }

                $instance = new $class();

                return $instance->handle(...$args);
            }

            if (is_callable($class)) {
                return (bool) $class(...$args);
            }

            return true;
        }

        if (is_string($middleware)) {
            if (!class_exists($middleware)) {
                $basename = basename(str_replace('\\', '/', $middleware));
                $file = dirname(__DIR__) . '/Middleware/' . $basename . '.php';

                if (file_exists($file)) {
                    require_once $file;
                }

                if (!class_exists($middleware) && class_exists($basename)) {
                    $middleware = $basename;
                }
            }

            if (!class_exists($middleware)) {
                error_log("Middleware class not found: {$middleware}");
                return false;
            }

            $instance = new $middleware();

            return $instance->handle();
        }

        return true;
    }

    /**
     * Normalize URI.
     */
    private function normalize(string $uri): string
    {
        $uri = parse_url($uri, PHP_URL_PATH);

        return rtrim($uri, '/') ?: '/';
    }
}