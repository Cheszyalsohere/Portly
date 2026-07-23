<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $portfolios = $request->user()
            ->portfolios()
            ->latest('updated_at')
            ->get()
            ->map(fn ($portfolio) => [
                'id'         => $portfolio->id,
                'title'      => $portfolio->title,
                'slug'       => $portfolio->slug,
                'updated_at' => $portfolio->updated_at->toIso8601String(),
            ]);

        return Inertia::render('dashboard', [
            'portfolios' => $portfolios,
        ]);
    }
}
