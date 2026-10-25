#include "core.h"
#include <assert.h>
#include <math.h>
#include <stdio.h>

static const float PI = 3.14159265358979323846f;

static void face(float x, float y, float target_x, float target_y) {
    bb_test_place(x, y, atan2f(target_y - y, target_x - x));
}

static void collect(float x, float y) {
    face(x, y - 0.8f, x, y);
    assert(bb_nearby() != 0);
    bb_interact();
}

int main(void) {
    float start_y;
    uint32_t *pixels;
    bb_reset();
    assert(bb_mode() == BB_MODE_TITLE);
    assert(bb_shards() == 0);
    assert(bb_talked_count() == 0);

    bb_start();
    assert(bb_mode() == BB_MODE_PLAYING);
    start_y = bb_player_y();
    bb_set_input(BB_INPUT_FORWARD);
    for (int i = 0; i < 60; ++i) bb_step(1.0f / 60.0f);
    bb_set_input(0);
    assert(bb_player_y() < start_y - 0.5f);

    bb_toggle_pause();
    assert(bb_mode() == BB_MODE_PAUSED);
    start_y = bb_player_y();
    bb_set_input(BB_INPUT_FORWARD);
    bb_step(1.0f);
    assert(bb_player_y() == start_y);
    bb_set_input(0);
    bb_toggle_pause();
    assert(bb_mode() == BB_MODE_PLAYING);

    face(5.5f, 6.3f, 5.5f, 5.5f);
    assert(bb_nearby() != 0);
    bb_interact();
    assert(bb_talked_count() == 1);
    assert(bb_message() == 1);

    collect(18.5f, 4.5f);
    assert(bb_shards() == 1);
    bb_interact();
    assert(bb_shards() == 1);

    face(12.5f, 5.3f, 12.5f, 4.5f);
    bb_interact();
    assert(bb_mode() == BB_MODE_PLAYING);
    assert(bb_message() == 5);

    collect(3.5f, 16.5f);
    collect(18.5f, 18.5f);
    assert(bb_shards() == 3);
    face(12.5f, 5.3f, 12.5f, 4.5f);
    bb_interact();
    assert(bb_mode() == BB_MODE_VICTORY);
    assert(bb_message() == 6);

    bb_start();
    assert(bb_mode() == BB_MODE_PLAYING);
    assert(bb_shards() == 0);
    assert(bb_talked_count() == 0);

    bb_test_place(1.4f, 1.4f, PI);
    bb_set_input(BB_INPUT_FORWARD);
    for (int i = 0; i < 120; ++i) bb_step(1.0f / 60.0f);
    bb_set_input(0);
    assert(bb_player_x() > 1.15f);

    bb_render();
    pixels = bb_framebuffer();
    assert(pixels != 0);
    for (int i = 0; i < 16; ++i) {
        assert((pixels[i] & 0xff000000u) == 0xff000000u);
    }

    puts("Blockbound C core tests passed");
    return 0;
}
