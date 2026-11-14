<?php
// Local test runner environment variables (for testing staging package against local MySQL)
putenv('DB_HOST=127.0.0.1');
putenv('DB_NAME=u3store');
putenv('DB_USER=root');
putenv('DB_PASS=');
putenv('DB_PORT=3306');
$_ENV['DB_HOST'] = '127.0.0.1';
$_ENV['DB_NAME'] = 'u3store';
$_ENV['DB_USER'] = 'root';
$_ENV['DB_PASS'] = '';
$_ENV['DB_PORT'] = '3306';

$htdocs = realpath(__DIR__ . '/../staging_deployment_package/htdocs');
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$file = $htdocs . $uri;

// 1. SECURITY BLOCK: Direct access to config or includes
if (preg_match('#^/(config|includes)(/.*)?$#i', $uri)) {
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Access to internal directory is denied.</p></body></html>');
}

// 2. SECURITY BLOCK: Direct access to sensitive extensions
if (preg_match('#\.(sql|sqlite|sqlite3|db|env|log|ini|sh|bak|md)$#i', $uri)) {
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Access to sensitive file type is denied.</p></body></html>');
}

// 3. SECURITY BLOCK: Block execution of scripts inside uploads/
if (preg_match('#^/uploads/.*(?i)\.(php|phtml|php3|php4|php5|php7|php8|phps|phar|sh|pl|cgi|asp|aspx|jsp|exe)$#', $uri)) {
    http_response_code(403);
    header('Content-Type: text/html; charset=utf-8');
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Script execution in uploads is strictly prohibited.</p></body></html>');
}

// 4. Directory listing block for uploads
if ($uri === '/uploads' || $uri === '/uploads/' || $uri === '/uploads/receipts' || $uri === '/uploads/receipts/') {
    http_response_code(403);
    $idx = rtrim($file, '/') . '/index.html';
    if (file_exists($idx)) {
        readfile($idx);
        exit;
    }
    die('<!DOCTYPE html><html><head><title>403 Forbidden</title></head><body><h1>403 Forbidden</h1><p>Directory listing is prohibited.</p></body></html>');
}

// Direct static file serving
if ($uri !== '/' && file_exists($file) && !is_dir($file)) {
    return false; // let built-in server serve static file
}

// Clean API routes
if (preg_match('#^/api/shipping/calculate$#', $uri)) {
    require $htdocs . '/api/shipping/calculate.php';
    exit;
}
if (preg_match('#^/api/auth/admin$#', $uri)) {
    require $htdocs . '/api/auth/admin.php';
    exit;
}
if (preg_match('#^/api/auth/customer$#', $uri)) {
    require $htdocs . '/api/auth/customer.php';
    exit;
}
if (preg_match('#^/api/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $apiFile = $htdocs . '/api/' . $m[1] . '.php';
    if (file_exists($apiFile)) {
        require $apiFile;
        exit;
    }
}

// Clean storefront routes
$routes = [
    '/' => '/index.php',
    '/shoes' => '/shoes.php',
    '/clothing' => '/clothing.php',
    '/shop' => '/shop.php',
    '/new-arrivals' => '/new-arrivals.php',
    '/collections' => '/collections.php',
    '/size-guide' => '/size-guide.php',
    '/cart' => '/cart.php',
    '/checkout' => '/checkout.php',
    '/track-order' => '/track-order.php',
    '/shipping-policy' => '/shipping-policy.php',
    '/return-policy' => '/return-policy.php',
    '/terms' => '/terms.php',
    '/privacy-policy' => '/privacy-policy.php',
    '/contact' => '/contact.php',
];

if (isset($routes[$uri])) {
    require $htdocs . $routes[$uri];
    exit;
}

if ($uri === '/admin/login') {
    require $htdocs . '/admin/login.php';
    exit;
}

if (preg_match('#^/admin/?$#', $uri)) {
    require $htdocs . '/admin/index.php';
    exit;
}

if (preg_match('#^/collections/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $_GET['slug'] = $m[1];
    require $htdocs . '/collection.php';
    exit;
}

if (preg_match('#^/products/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $_GET['slug'] = $m[1];
    require $htdocs . '/product.php';
    exit;
}

if (preg_match('#^/order-confirmation/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $_GET['orderNumber'] = $m[1];
    require $htdocs . '/order-confirmation.php';
    exit;
}

if (preg_match('#^/order/track/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $_GET['token'] = $m[1];
    require $htdocs . '/track-order.php';
    exit;
}

if (preg_match('#^/invoice/([a-zA-Z0-9_-]+)$#', $uri, $m)) {
    $_GET['orderNumber'] = $m[1];
    require $htdocs . '/api/invoices.php';
    exit;
}

// Default fallback
if (file_exists($htdocs . '/index.php')) {
    require $htdocs . '/index.php';
    exit;
}
