<?php

use Inertia\Testing\AssertableInertia as Assert;

test('home page renders the welcome component', function () {
    $this->get(route('home'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('canRegister'));
});
