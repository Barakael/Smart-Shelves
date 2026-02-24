<?php

namespace Database\Factories;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SubscriptionPlan>
 */
class SubscriptionPlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->word(),
            'price' => $this->faker->randomFloat(2, 50, 500),
            'period_days' => 365,
            'description' => $this->faker->sentence(),
            'features' => json_encode([
                'users' => $this->faker->numberBetween(5, 50),
                'cabinets' => $this->faker->numberBetween(5, 20),
            ]),
            'is_active' => true,
        ];
    }
}
