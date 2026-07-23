<?php

namespace App\Policies;

use App\Models\Portfolio;
use App\Models\User;

class PortfolioPolicy
{
    public function view(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    public function update(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    public function delete(User $user, Portfolio $portfolio): bool
    {
        return $this->owns($user, $portfolio);
    }

    private function owns(User $user, Portfolio $portfolio): bool
    {
        return $user->id === $portfolio->user_id;
    }
}
