#include "core.h"

#define PI 3.14159265358979323846f
#define TAU 6.28318530717958647692f
#define FOV 1.22173047639603070356f
#define ENTITY_COUNT 7
#define PLAYER_RADIUS 0.19f

typedef struct {
    float x;
    float y;
    unsigned char kind;
    unsigned char active;
} Entity;

typedef struct {
    float x;
    float y;
    float angle;
    float time;
    unsigned int input;
    unsigned int mode;
    unsigned int shards;
    unsigned int talked;
    unsigned int message;
} Game;

static Game game;
static unsigned char world_map[BB_MAP_HEIGHT][BB_MAP_WIDTH];
static Entity entities[ENTITY_COUNT];
static uint32_t framebuffer[BB_WIDTH * BB_HEIGHT];
static float depth_buffer[BB_WIDTH];

static float absolute(float value) {
    return value < 0.0f ? -value : value;
}

static float wrap_angle(float angle) {
    while (angle > PI) angle -= TAU;
    while (angle < -PI) angle += TAU;
    return angle;
}

static float sine(float angle) {
    float x = wrap_angle(angle);
    float x2;
    if (x > PI * 0.5f) x = PI - x;
    if (x < -PI * 0.5f) x = -PI - x;
    x2 = x * x;
    return x * (1.0f - x2 / 6.0f + x2 * x2 / 120.0f - x2 * x2 * x2 / 5040.0f);
}

static float cosine(float angle) {
    return sine(angle + PI * 0.5f);
}

static float square_root(float value) {
    float guess;
    if (value <= 0.0f) return 0.0f;
    guess = value > 1.0f ? value : 1.0f;
    for (int i = 0; i < 7; ++i) guess = 0.5f * (guess + value / guess);
    return guess;
}

static uint32_t color(unsigned int red, unsigned int green, unsigned int blue) {
    return 0xff000000u | ((blue & 255u) << 16) | ((green & 255u) << 8) | (red & 255u);
}

static uint32_t shade(uint32_t source, unsigned int percent) {
    unsigned int red = (source & 255u) * percent / 100u;
    unsigned int green = ((source >> 8) & 255u) * percent / 100u;
    unsigned int blue = ((source >> 16) & 255u) * percent / 100u;
    return color(red, green, blue);
}

static void pixel(int x, int y, uint32_t value) {
    if (x >= 0 && x < BB_WIDTH && y >= 0 && y < BB_HEIGHT) {
        framebuffer[y * BB_WIDTH + x] = value;
    }
}

static void rectangle(int x, int y, int width, int height, uint32_t value) {
    for (int row = y; row < y + height; ++row) {
        for (int column = x; column < x + width; ++column) pixel(column, row, value);
    }
}

static void fill_rect(int left, int top, int right, int bottom, unsigned char tile) {
    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) world_map[y][x] = tile;
    }
}

static void build_world(void) {
    for (int y = 0; y < BB_MAP_HEIGHT; ++y) {
        for (int x = 0; x < BB_MAP_WIDTH; ++x) {
            world_map[y][x] = (x == 0 || y == 0 || x == BB_MAP_WIDTH - 1 || y == BB_MAP_HEIGHT - 1) ? 1 : 0;
        }
    }
    fill_rect(2, 2, 8, 4, 2);
    fill_rect(15, 2, 21, 3, 3);
    fill_rect(2, 9, 7, 13, 4);
    fill_rect(16, 9, 21, 14, 2);
    fill_rect(9, 15, 11, 18, 3);
    fill_rect(21, 16, 22, 22, 5);
    world_map[3][12] = 6;
    world_map[7][8] = 7;
    world_map[8][14] = 7;
    world_map[15][4] = 7;
    world_map[16][19] = 7;
    world_map[19][14] = 7;
    world_map[20][6] = 7;
}

static void reset_world(void) {
    game.x = 12.5f;
    game.y = 21.0f;
    game.angle = -PI * 0.5f;
    game.time = 0.0f;
    game.input = 0;
    game.shards = 0;
    game.talked = 0;
    game.message = 0;
    build_world();
    entities[0] = (Entity){5.5f, 5.5f, 0, 1};
    entities[1] = (Entity){17.5f, 7.5f, 0, 1};
    entities[2] = (Entity){5.5f, 18.5f, 0, 1};
    entities[3] = (Entity){18.5f, 4.5f, 1, 1};
    entities[4] = (Entity){3.5f, 16.5f, 1, 1};
    entities[5] = (Entity){18.5f, 18.5f, 1, 1};
    entities[6] = (Entity){12.5f, 4.5f, 2, 1};
}

void bb_reset(void) {
    reset_world();
    game.mode = BB_MODE_TITLE;
}

void bb_start(void) {
    reset_world();
    game.mode = BB_MODE_PLAYING;
}

void bb_toggle_pause(void) {
    game.input = 0;
    if (game.mode == BB_MODE_PLAYING) game.mode = BB_MODE_PAUSED;
    else if (game.mode == BB_MODE_PAUSED) game.mode = BB_MODE_PLAYING;
}

void bb_set_input(unsigned int flags) {
    game.input = flags & 63u;
}

static int solid(float x, float y) {
    int map_x = (int)x;
    int map_y = (int)y;
    if (map_x < 0 || map_y < 0 || map_x >= BB_MAP_WIDTH || map_y >= BB_MAP_HEIGHT) return 1;
    return world_map[map_y][map_x] != 0;
}

static int can_stand(float x, float y) {
    return !solid(x - PLAYER_RADIUS, y - PLAYER_RADIUS)
        && !solid(x + PLAYER_RADIUS, y - PLAYER_RADIUS)
        && !solid(x - PLAYER_RADIUS, y + PLAYER_RADIUS)
        && !solid(x + PLAYER_RADIUS, y + PLAYER_RADIUS);
}

void bb_step(float seconds) {
    float turn = 0.0f;
    float forward = 0.0f;
    float strafe = 0.0f;
    float dx;
    float dy;
    if (game.mode != BB_MODE_PLAYING || seconds <= 0.0f) return;
    if (seconds > 0.05f) seconds = 0.05f;
    if (game.input & BB_INPUT_TURN_LEFT) turn -= 1.0f;
    if (game.input & BB_INPUT_TURN_RIGHT) turn += 1.0f;
    if (game.input & BB_INPUT_FORWARD) forward += 1.0f;
    if (game.input & BB_INPUT_BACK) forward -= 1.0f;
    if (game.input & BB_INPUT_LEFT) strafe -= 1.0f;
    if (game.input & BB_INPUT_RIGHT) strafe += 1.0f;
    game.angle = wrap_angle(game.angle + turn * 1.9f * seconds);
    if (forward != 0.0f && strafe != 0.0f) {
        forward *= 0.70710678f;
        strafe *= 0.70710678f;
    }
    dx = (cosine(game.angle) * forward + cosine(game.angle + PI * 0.5f) * strafe) * 2.25f * seconds;
    dy = (sine(game.angle) * forward + sine(game.angle + PI * 0.5f) * strafe) * 2.25f * seconds;
    if (can_stand(game.x + dx, game.y)) game.x += dx;
    if (can_stand(game.x, game.y + dy)) game.y += dy;
    game.time += seconds;
}

static int nearest_entity(void) {
    int nearest = -1;
    float nearest_distance = 2.5f;
    float facing_x = cosine(game.angle);
    float facing_y = sine(game.angle);
    for (int i = 0; i < ENTITY_COUNT; ++i) {
        float dx;
        float dy;
        float distance;
        float facing;
        if (!entities[i].active) continue;
        dx = entities[i].x - game.x;
        dy = entities[i].y - game.y;
        distance = square_root(dx * dx + dy * dy);
        if (distance > 1.55f || distance >= nearest_distance || distance < 0.001f) continue;
        facing = (dx * facing_x + dy * facing_y) / distance;
        if (facing < 0.35f) continue;
        nearest = i;
        nearest_distance = distance;
    }
    return nearest;
}

void bb_interact(void) {
    int index;
    if (game.mode != BB_MODE_PLAYING) return;
    index = nearest_entity();
    if (index < 0) {
        game.message = 7;
        return;
    }
    if (entities[index].kind == 0) {
        game.talked |= 1u << index;
        game.message = (unsigned int)index + 1u;
    } else if (entities[index].kind == 1) {
        entities[index].active = 0;
        game.shards += 1;
        game.message = 4;
    } else if (game.shards == 3) {
        game.message = 6;
        game.mode = BB_MODE_VICTORY;
        game.input = 0;
    } else {
        game.message = 5;
    }
}

unsigned int bb_mode(void) { return game.mode; }
unsigned int bb_shards(void) { return game.shards; }

unsigned int bb_talked_count(void) {
    return (game.talked & 1u) + ((game.talked >> 1) & 1u) + ((game.talked >> 2) & 1u);
}

unsigned int bb_message(void) { return game.message; }

unsigned int bb_nearby(void) {
    int index = nearest_entity();
    if (index < 0) return 0;
    return ((unsigned int)entities[index].kind + 1u) << 8 | ((unsigned int)index + 1u);
}

float bb_player_x(void) { return game.x; }
float bb_player_y(void) { return game.y; }
float bb_player_angle(void) { return game.angle; }
uint32_t *bb_framebuffer(void) { return framebuffer; }

static uint32_t wall_color(unsigned char tile) {
    if (tile == 2) return color(214, 132, 105);
    if (tile == 3) return color(92, 139, 166);
    if (tile == 4) return color(151, 125, 178);
    if (tile == 5) return color(45, 110, 151);
    if (tile == 6) return color(230, 190, 88);
    if (tile == 7) return color(67, 125, 85);
    return color(92, 106, 119);
}

static void draw_background(void) {
    for (int y = 0; y < BB_HEIGHT; ++y) {
        uint32_t value;
        if (y < BB_HEIGHT / 2) {
            unsigned int t = (unsigned int)y;
            value = color(116 + t / 3, 177 + t / 5, 211 + t / 8);
        } else {
            unsigned int t = (unsigned int)(y - BB_HEIGHT / 2);
            value = color(105 - t / 4, 151 - t / 5, 105 - t / 4);
        }
        for (int x = 0; x < BB_WIDTH; ++x) framebuffer[y * BB_WIDTH + x] = value;
    }
    rectangle(211, 15, 17, 17, color(255, 231, 151));
    rectangle(214, 12, 11, 23, color(255, 231, 151));
    rectangle(208, 18, 23, 11, color(255, 231, 151));
    rectangle(32, 23, 48, 5, color(210, 231, 232));
    rectangle(42, 18, 25, 5, color(210, 231, 232));
    rectangle(171, 38, 54, 4, color(197, 222, 228));
    rectangle(183, 34, 29, 4, color(197, 222, 228));
}

static void cast_walls(void) {
    for (int x = 0; x < BB_WIDTH; ++x) {
        float ray = game.angle + (((float)x + 0.5f) / BB_WIDTH - 0.5f) * FOV;
        float ray_x = cosine(ray);
        float ray_y = sine(ray);
        float delta_x = absolute(ray_x) < 0.0001f ? 10000.0f : absolute(1.0f / ray_x);
        float delta_y = absolute(ray_y) < 0.0001f ? 10000.0f : absolute(1.0f / ray_y);
        int map_x = (int)game.x;
        int map_y = (int)game.y;
        int step_x = ray_x < 0.0f ? -1 : 1;
        int step_y = ray_y < 0.0f ? -1 : 1;
        float side_x = ray_x < 0.0f ? (game.x - map_x) * delta_x : (map_x + 1.0f - game.x) * delta_x;
        float side_y = ray_y < 0.0f ? (game.y - map_y) * delta_y : (map_y + 1.0f - game.y) * delta_y;
        int side = 0;
        int steps = 0;
        unsigned char tile = 0;
        while (steps++ < 64 && tile == 0) {
            if (side_x < side_y) {
                side_x += delta_x;
                map_x += step_x;
                side = 0;
            } else {
                side_y += delta_y;
                map_y += step_y;
                side = 1;
            }
            if (map_x < 0 || map_y < 0 || map_x >= BB_MAP_WIDTH || map_y >= BB_MAP_HEIGHT) break;
            tile = world_map[map_y][map_x];
        }
        if (tile != 0) {
            float distance = side == 0 ? side_x - delta_x : side_y - delta_y;
            float corrected = distance * cosine(wrap_angle(ray - game.angle));
            float wall_x;
            int line_height;
            int top;
            int bottom;
            uint32_t base;
            if (corrected < 0.05f) corrected = 0.05f;
            depth_buffer[x] = corrected;
            line_height = (int)(BB_HEIGHT / corrected);
            top = BB_HEIGHT / 2 - line_height / 2;
            bottom = top + line_height;
            wall_x = side == 0 ? game.y + distance * ray_y : game.x + distance * ray_x;
            wall_x -= (float)((int)wall_x);
            base = wall_color(tile);
            if (side) base = shade(base, 78);
            if (corrected > 3.0f) {
                unsigned int light = corrected > 11.0f ? 48u : (unsigned int)(100.0f - corrected * 4.7f);
                base = shade(base, light);
            }
            for (int y = top < 0 ? 0 : top; y < bottom && y < BB_HEIGHT; ++y) {
                uint32_t value = base;
                int texture_x = (int)(wall_x * 16.0f);
                if (texture_x == 0 || ((y - top) % 14) == 0) value = shade(base, 72);
                else if (((y - top) % 14) == 1) value = shade(base, 112);
                framebuffer[y * BB_WIDTH + x] = value;
            }
        } else {
            depth_buffer[x] = 1000.0f;
        }
    }
}

static void draw_entity_pixel(int screen_x, int y, float distance, uint32_t value) {
    if (screen_x >= 0 && screen_x < BB_WIDTH && distance <= depth_buffer[screen_x] + 0.15f) {
        pixel(screen_x, y, value);
    }
}

static void draw_sprite(int index) {
    Entity *entity = &entities[index];
    float dx = entity->x - game.x;
    float dy = entity->y - game.y;
    float forward = dx * cosine(game.angle) + dy * sine(game.angle);
    float lateral = -dx * sine(game.angle) + dy * cosine(game.angle);
    int center;
    int size;
    int ground;
    int left;
    int right;
    if (forward < 0.15f || absolute(lateral / forward) > 1.1f) return;
    center = (int)((0.5f + lateral / forward / 1.4f) * BB_WIDTH);
    size = (int)(BB_HEIGHT / forward * (entity->kind == 0 ? 0.62f : entity->kind == 1 ? 0.30f : 1.05f));
    if (size < 2 || size > 500) return;
    ground = BB_HEIGHT / 2 + (int)(BB_HEIGHT / (2.0f * forward));
    left = center - size / 2;
    right = center + size / 2;
    if (entity->kind == 0) {
        uint32_t coats[3] = {color(237, 112, 99), color(91, 199, 181), color(177, 137, 214)};
        int head = size / 3;
        for (int x = left; x < right; ++x) {
            for (int y = ground - size; y < ground; ++y) {
                uint32_t value;
                if (y < ground - size + head) value = color(238, 190, 151);
                else if (y < ground - size / 5) value = coats[index];
                else value = color(52, 66, 80);
                if (x == left || x == right - 1) value = shade(value, 70);
                draw_entity_pixel(x, y, forward, value);
            }
        }
        for (int x = center - size / 5; x < center + size / 5; ++x) {
            draw_entity_pixel(x, ground - size + head / 2, forward, color(42, 55, 65));
        }
    } else if (entity->kind == 1) {
        int radius = size / 2;
        int center_y = ground - size + (int)(sine(game.time * 3.0f + index) * size * 0.12f);
        for (int x = left; x < right; ++x) {
            for (int y = center_y - radius; y <= center_y + radius; ++y) {
                int distance = absolute((float)(x - center)) + absolute((float)(y - center_y));
                if (distance <= radius) {
                    uint32_t value = x < center ? color(255, 235, 126) : color(239, 169, 72);
                    draw_entity_pixel(x, y, forward, value);
                }
            }
        }
    } else {
        for (int x = left; x < right; ++x) {
            for (int y = ground - size; y < ground; ++y) {
                int relative_y = y - (ground - size);
                int half_width = relative_y < size / 3 ? (relative_y * size / 6) / (size / 3 + 1) : size / 6;
                if (absolute((float)(x - center)) <= half_width) {
                    uint32_t value = x < center ? color(127, 239, 218) : color(60, 172, 177);
                    draw_entity_pixel(x, y, forward, value);
                }
            }
        }
    }
}

static int entity_order[ENTITY_COUNT];
static float entity_distance[ENTITY_COUNT];

static void draw_sprites(void) {
    for (int i = 0; i < ENTITY_COUNT; ++i) {
        float dx = entities[i].x - game.x;
        float dy = entities[i].y - game.y;
        entity_order[i] = i;
        entity_distance[i] = dx * dx + dy * dy;
    }
    for (int i = 1; i < ENTITY_COUNT; ++i) {
        int order = entity_order[i];
        float distance = entity_distance[i];
        int j = i;
        while (j > 0 && entity_distance[j - 1] < distance) {
            entity_order[j] = entity_order[j - 1];
            entity_distance[j] = entity_distance[j - 1];
            --j;
        }
        entity_order[j] = order;
        entity_distance[j] = distance;
    }
    for (int i = 0; i < ENTITY_COUNT; ++i) {
        if (entities[entity_order[i]].active) draw_sprite(entity_order[i]);
    }
}

static void draw_minimap(void) {
    const int origin_x = BB_WIDTH - 81;
    const int origin_y = 7;
    const int scale = 3;
    rectangle(origin_x - 3, origin_y - 3, BB_MAP_WIDTH * scale + 6, BB_MAP_HEIGHT * scale + 6, color(30, 48, 57));
    for (int y = 0; y < BB_MAP_HEIGHT; ++y) {
        for (int x = 0; x < BB_MAP_WIDTH; ++x) {
            unsigned char tile = world_map[y][x];
            rectangle(origin_x + x * scale, origin_y + y * scale, scale, scale,
                tile ? shade(wall_color(tile), 80) : color(77, 105, 87));
        }
    }
    for (int i = 3; i < 6; ++i) {
        if (entities[i].active) rectangle(origin_x + (int)entities[i].x * scale, origin_y + (int)entities[i].y * scale, 2, 2, color(255, 225, 112));
    }
    rectangle(origin_x + (int)game.x * scale, origin_y + (int)game.y * scale, 3, 3, color(247, 248, 234));
    for (int i = 1; i < 6; ++i) {
        pixel(origin_x + (int)((game.x + cosine(game.angle) * i * 0.18f) * scale),
            origin_y + (int)((game.y + sine(game.angle) * i * 0.18f) * scale), color(247, 248, 234));
    }
}

void bb_render(void) {
    draw_background();
    cast_walls();
    draw_sprites();
    draw_minimap();
}

#ifdef BB_TEST
void bb_test_place(float x, float y, float angle) {
    game.x = x;
    game.y = y;
    game.angle = angle;
    game.input = 0;
}
#endif
