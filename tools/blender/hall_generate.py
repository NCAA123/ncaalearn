"""Procedurally generates the tournament hall shell and exports it to GLB.

Run with:
  blender -b -P tools/blender/hall_generate.py -- <output.glb>

Dimensions follow the brief: ~30m x 20m x 6m. Box-primitive modeling (no
sculpting) so this stays fully scriptable/regenerable -- swap in real
architectural detail later without changing the export pipeline.
"""

import bpy
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from materials import material, make_emissive  # noqa: E402

HALL_LENGTH = 30.0
HALL_WIDTH = 20.0
HALL_HEIGHT = 6.0
WALL_THICKNESS = 0.3


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def add_box(name, size, location, material_key, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0] / 2, size[1] / 2, size[2] / 2)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    obj.data.materials.append(material(material_key))
    return obj


def build_floor_and_ceiling():
    add_box("Floor", (HALL_LENGTH, HALL_WIDTH, 0.2), (0, 0, -0.1), "floor")
    add_box("Ceiling", (HALL_LENGTH, HALL_WIDTH, 0.2), (0, 0, HALL_HEIGHT + 0.1), "ceiling")

    # Recessed light panels: a grid of emissive strips set slightly below
    # ceiling height so they read as "recessed" rather than flush.
    cols, rows = 5, 3
    for cx in range(cols):
        for cy in range(rows):
            x = (cx - (cols - 1) / 2) * (HALL_LENGTH / (cols + 1))
            y = (cy - (rows - 1) / 2) * (HALL_WIDTH / (rows + 1))
            obj = add_box(
                f"LightPanel_{cx}_{cy}", (2.2, 0.6, 0.05), (x, y, HALL_HEIGHT - 0.08), "light_panel"
            )
            obj.data.materials[0] = make_emissive("hall_light_emissive", (1.0, 0.97, 0.88), strength=3.0)
            light = bpy.data.lights.new(name=f"PanelLight_{cx}_{cy}", type="AREA")
            light.energy = 60
            light.size = 2.0
            light_obj = bpy.data.objects.new(f"PanelLightObj_{cx}_{cy}", light)
            light_obj.location = (x, y, HALL_HEIGHT - 0.15)
            light_obj.rotation_euler = (3.14159, 0, 0)
            bpy.context.collection.objects.link(light_obj)


def build_walls():
    half_l, half_w = HALL_LENGTH / 2, HALL_WIDTH / 2
    # Back wall (banner wall, +Y) and front wall (with double doors, -Y).
    add_box("Wall_Back", (HALL_LENGTH, WALL_THICKNESS, HALL_HEIGHT), (0, half_w, HALL_HEIGHT / 2), "banner")
    # Front wall split around a 2.4m door gap in the middle.
    door_gap = 2.4
    front_seg = (HALL_LENGTH - door_gap) / 2
    add_box(
        "Wall_Front_Left",
        (front_seg, WALL_THICKNESS, HALL_HEIGHT),
        (-(door_gap / 2 + front_seg / 2), -half_w, HALL_HEIGHT / 2),
        "wall",
    )
    add_box(
        "Wall_Front_Right",
        (front_seg, WALL_THICKNESS, HALL_HEIGHT),
        (door_gap / 2 + front_seg / 2, -half_w, HALL_HEIGHT / 2),
        "wall",
    )
    add_box("Door_Left", (door_gap / 2, 0.1, 2.4), (-door_gap / 4, -half_w, 1.2), "door")
    add_box("Door_Right", (door_gap / 2, 0.1, 2.4), (door_gap / 4, -half_w, 1.2), "door")

    # Side walls (+X / -X) with window gaps and curtains.
    add_box("Wall_Right", (WALL_THICKNESS, HALL_WIDTH, HALL_HEIGHT), (half_l, 0, HALL_HEIGHT / 2), "wall")
    add_box("Wall_Left", (WALL_THICKNESS, HALL_WIDTH, HALL_HEIGHT), (-half_l, 0, HALL_HEIGHT / 2), "wall")

    window_count = 4
    for i in range(window_count):
        y = (i - (window_count - 1) / 2) * (HALL_WIDTH / (window_count + 1))
        for side, x in (("Right", half_l - 0.05), ("Left", -half_l + 0.05)):
            add_box(f"Curtain_{side}_{i}", (0.08, 1.6, 2.6), (x, y, 3.2), "curtain")

    # Skirting board along the base of every wall.
    add_box("Skirting_Back", (HALL_LENGTH, 0.35, 0.15), (0, half_w - 0.15, 0.075), "column")
    add_box("Skirting_Left", (0.35, HALL_WIDTH, 0.15), (-half_l + 0.15, 0, 0.075), "column")
    add_box("Skirting_Right", (0.35, HALL_WIDTH, 0.15), (half_l - 0.15, 0, 0.075), "column")


def build_columns():
    half_l, half_w = HALL_LENGTH / 2, HALL_WIDTH / 2
    xs = [-half_l + 4, -half_l * 0.3, half_l * 0.3, half_l - 4]
    ys = [-half_w + 3, half_w - 3]
    for xi, x in enumerate(xs):
        for yi, y in enumerate(ys):
            add_box(f"Column_{xi}_{yi}", (0.6, 0.6, HALL_HEIGHT), (x, y, HALL_HEIGHT / 2), "column")


def build_arbiter_desk_and_display():
    half_w = HALL_WIDTH / 2
    # Raised platform + desk against the banner wall.
    add_box("ArbiterPlatform", (6.0, 1.8, 0.3), (0, half_w - 1.2, 0.15), "column")
    add_box("ArbiterDesk", (5.4, 0.9, 1.0), (0, half_w - 1.0, 0.8), "desk")
    # Pairing/results display board beside the desk.
    add_box("ResultsBoard", (3.0, 0.08, 2.0), (-8, half_w - 0.2, 2.2), "banner")


def build_spectator_rope(x_start):
    # A simple roped spectator zone: posts + a "rope" bar along one side.
    length = 6.0
    post_count = 5
    for i in range(post_count):
        x = x_start + i * (length / (post_count - 1))
        add_box(f"RopePost_{x_start}_{i}", (0.08, 0.08, 0.9), (x, -HALL_WIDTH / 2 + 3, 0.45), "table_leg")
    add_box(
        f"Rope_{x_start}",
        (length, 0.05, 0.05),
        (x_start + length / 2, -HALL_WIDTH / 2 + 3, 0.85),
        "curtain",
    )


def main():
    clear_scene()
    build_floor_and_ceiling()
    build_walls()
    build_columns()
    build_arbiter_desk_and_display()
    build_spectator_rope(4.0)

    out_path = sys.argv[-1]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_lights=True,
        export_apply=True,
    )
    print(f"HALL_EXPORT_OK: {out_path}")


if __name__ == "__main__":
    main()
