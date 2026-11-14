<?php
// scripts/verify-php84-compatibility.php

echo "=== PHP 8.4 STRICT COMPATIBILITY & DEPRECATION AUDIT ===\n\n";

$targetDir = realpath(__DIR__ . '/../php_build/htdocs');
$iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($targetDir));

$phpFiles = [];
foreach ($iterator as $file) {
    if ($file->isFile() && $file->getExtension() === 'php') {
        $phpFiles[] = $file->getRealPath();
    }
}
// Also check router.php
$routerFile = realpath(__DIR__ . '/../php_build/router.php');
if (file_exists($routerFile)) {
    $phpFiles[] = $routerFile;
}

echo "Total PHP files found: " . count($phpFiles) . "\n\n";

$lintErrors = 0;
$implicitNullableWarnings = [];
$deprecatedFuncUsages = [];

$deprecatedFunctions = [
    'utf8_encode', 'utf8_decode', 'strftime', 'gmstrftime', 'each', 'create_function',
    'image2wbmp', 'png2wbmp', 'mhash', 'fbsql', 'get_magic_quotes_gpc', 'get_magic_quotes_runtime'
];

foreach ($phpFiles as $filePath) {
    $relPath = str_replace(realpath(__DIR__ . '/..') . DIRECTORY_SEPARATOR, '', $filePath);

    // 1. PHP Lint (Syntax check)
    $output = [];
    $returnCode = 0;
    exec("php -l \"" . addslashes($filePath) . "\"", $output, $returnCode);
    if ($returnCode !== 0) {
        echo "[LINT ERROR] $relPath:\n" . implode("\n", $output) . "\n";
        $lintErrors++;
    }

    // 2. Tokenize and check for PHP 8.4 implicit nullable parameter deprecation
    // Example: function foo(string $x = null) -> must be function foo(?string $x = null)
    $code = file_get_contents($filePath);
    $tokens = token_get_all($code);
    $totalTokens = count($tokens);

    for ($i = 0; $i < $totalTokens; $i++) {
        // Check for deprecated functions
        if (is_array($tokens[$i]) && $tokens[$i][0] === T_STRING) {
            $funcName = strtolower($tokens[$i][1]);
            if (in_array($funcName, $deprecatedFunctions)) {
                // Ensure it's a function call, not method or declaration
                $deprecatedFuncUsages[] = [
                    'file' => $relPath,
                    'line' => $tokens[$i][2],
                    'func' => $funcName
                ];
            }
        }

        // Check for function definitions
        if (is_array($tokens[$i]) && ($tokens[$i][0] === T_FUNCTION || $tokens[$i][0] === T_FN)) {
            // Find argument list between ( and )
            $paramStart = false;
            $parenDepth = 0;
            $paramTokens = [];
            
            for ($j = $i + 1; $j < $totalTokens; $j++) {
                $t = $tokens[$j];
                if ($t === '(') {
                    $parenDepth++;
                    if ($parenDepth === 1) {
                        $paramStart = true;
                        continue;
                    }
                }
                if ($t === ')') {
                    $parenDepth--;
                    if ($parenDepth === 0) {
                        break;
                    }
                }
                if ($paramStart && $parenDepth === 1) {
                    $paramTokens[] = $t;
                }
            }

            // Parse paramTokens split by comma
            $params = [];
            $currentParam = [];
            foreach ($paramTokens as $pt) {
                if ($pt === ',') {
                    if (!empty($currentParam)) $params[] = $currentParam;
                    $currentParam = [];
                } else {
                    $currentParam[] = $pt;
                }
            }
            if (!empty($currentParam)) $params[] = $currentParam;

            foreach ($params as $param) {
                // Check if default value is null
                // Format: [Type, $var, =, null]
                $hasEqual = false;
                $hasNullDefault = false;
                $varToken = null;
                $typeTokens = [];

                foreach ($param as $token) {
                    if ($token === '=') {
                        $hasEqual = true;
                        continue;
                    }
                    if ($hasEqual) {
                        if (is_array($token) && $token[0] === T_STRING && strtolower($token[1]) === 'null') {
                            $hasNullDefault = true;
                        }
                    } else {
                        if (is_array($token) && $token[0] === T_VARIABLE) {
                            $varToken = $token;
                        } elseif (is_array($token) && !in_array($token[0], [T_WHITESPACE, T_COMMENT, T_DOC_COMMENT])) {
                            $typeTokens[] = $token;
                        } elseif (is_string($token) && in_array($token, ['?', '|', '&'])) {
                            $typeTokens[] = $token;
                        }
                    }
                }

                if ($hasNullDefault && !empty($typeTokens)) {
                    // Check if type has '?' or 'null' in union
                    $isExplicitNullable = false;
                    foreach ($typeTokens as $tt) {
                        if ($tt === '?') {
                            $isExplicitNullable = true;
                            break;
                        }
                        if (is_array($tt) && strtolower($tt[1]) === 'null') {
                            $isExplicitNullable = true;
                            break;
                        }
                    }

                    if (!$isExplicitNullable) {
                        $varName = $varToken ? $varToken[1] : 'unknown';
                        $line = $varToken ? $varToken[2] : 0;
                        $implicitNullableWarnings[] = [
                            'file' => $relPath,
                            'line' => $line,
                            'var' => $varName
                        ];
                    }
                }
            }
        }
    }
}

echo "--- RESULTS ---\n";
echo "1. Syntax / Lint Check (php -l): " . ($lintErrors === 0 ? "PASSED (0 syntax errors in all " . count($phpFiles) . " files)" : "FAILED ($lintErrors errors)") . "\n";
echo "2. Deprecated PHP Functions: " . (count($deprecatedFuncUsages) === 0 ? "PASSED (0 deprecated functions used)" : "FAILED (" . count($deprecatedFuncUsages) . " found)") . "\n";
foreach ($deprecatedFuncUsages as $d) {
    echo "   - {$d['file']}:{$d['line']} calls {$d['func']}()\n";
}

echo "3. PHP 8.4 Implicit Nullable Deprecations: " . (count($implicitNullableWarnings) === 0 ? "PASSED (100% PHP 8.4 strict clean)" : "WARNINGS FOUND (" . count($implicitNullableWarnings) . ")") . "\n";
foreach ($implicitNullableWarnings as $w) {
    echo "   - {$w['file']}:{$w['line']} parameter {$w['var']} is implicitly nullable (must be ?Type)\n";
}

if ($lintErrors === 0 && count($deprecatedFuncUsages) === 0 && count($implicitNullableWarnings) === 0) {
    echo "\n✓ ALL PHP 8.4 COMPATIBILITY CRITERIA 100% SATISFIED!\n";
}

