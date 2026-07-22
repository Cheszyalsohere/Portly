<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/*
 * Bind Pest-style tests (it/test closures) to the application TestCase and
 * give every feature test a fresh database.
 *
 * The starter kit's own tests are PHPUnit classes that already extend
 * TestCase and use RefreshDatabase themselves, so this file does not
 * affect them.
 */

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

pest()->extend(TestCase::class)
    ->in('Unit');
