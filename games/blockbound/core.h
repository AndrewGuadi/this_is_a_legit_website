#ifndef BLOCKBOUND_CORE_H
#define BLOCKBOUND_CORE_H

#include <stdint.h>

#define BB_WIDTH 320
#define BB_HEIGHT 180
#define BB_MAP_WIDTH 24
#define BB_MAP_HEIGHT 24

enum {
    BB_MODE_TITLE = 0,
    BB_MODE_PLAYING = 1,
    BB_MODE_PAUSED = 2,
    BB_MODE_VICTORY = 3
};

enum {
    BB_INPUT_FORWARD = 1,
    BB_INPUT_BACK = 2,
    BB_INPUT_LEFT = 4,
    BB_INPUT_RIGHT = 8,
    BB_INPUT_TURN_LEFT = 16,
    BB_INPUT_TURN_RIGHT = 32
};

void bb_reset(void);
void bb_start(void);
void bb_toggle_pause(void);
void bb_set_input(unsigned int flags);
void bb_step(float seconds);
void bb_interact(void);
unsigned int bb_mode(void);
unsigned int bb_shards(void);
unsigned int bb_talked_count(void);
unsigned int bb_message(void);
unsigned int bb_nearby(void);
float bb_player_x(void);
float bb_player_y(void);
float bb_player_angle(void);
uint32_t *bb_framebuffer(void);
void bb_render(void);

#ifdef BB_TEST
void bb_test_place(float x, float y, float angle);
#endif

#endif
