"""Procedurally generates the table+chairs kit and exports it to GLB.

Deliberately does NOT model a chess board or pieces -- Part A's own brief
says to reuse Part B's (now complete) Three.js chess set instead of
modelling a second one, so this kit is instanced under the existing
<ChessSet> in the browser, not baked into the GLB.

Run with:
  blender -b -P tools/blender/table_kit_generate.py -- <output.glb>
"""

import bpy
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
from materials import material  # noqa: E402

TABLE_TOP_SIZE = (1.4, 1.0, 0.05)
TABLE_HEIGHT = 0.75
CHAIR_SEAT_HEIGHT = 0.45


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


def build_table():
    add_box("TableTop", TABLE_TOP_SIZE, (0, 0, TABLE_HEIGHT), "table_top")
    leg_positions = [
        (TABLE_TOP_SIZE[0] / 2 - 0.08, TABLE_TOP_SIZE[1] / 2 - 0.08),
        (-(TABLE_TOP_SIZE[0] / 2 - 0.08), TABLE_TOP_SIZE[1] / 2 - 0.08),
        (TABLE_TOP_SIZE[0] / 2 - 0.08, -(TABLE_TOP_SIZE[1] / 2 - 0.08)),
        (-(TABLE_TOP_SIZE[0] / 2 - 0.08), -(TABLE_TOP_SIZE[1] / 2 - 0.08)),
    ]
    for i, (lx, ly) in enumerate(leg_positions):
        add_box(f"TableLeg_{i}", (0.06, 0.06, TABLE_HEIGHT), (lx, ly, TABLE_HEIGHT / 2), "table_leg")


def build_chair(name_prefix, x_offset):
    seat_y = TABLE_TOP_SIZE[1] / 2 + 0.35
    add_box(f"{name_prefix}_Seat", (0.42, 0.42, 0.05), (x_offset, seat_y, CHAIR_SEAT_HEIGHT), "chair_seat")
    add_box(
        f"{name_prefix}_Back",
        (0.42, 0.05, 0.5),
        (x_offset, seat_y + 0.2, CHAIR_SEAT_HEIGHT + 0.25),
        "chair",
    )
    leg_positions = [
        (x_offset - 0.17, seat_y - 0.17),
        (x_offset + 0.17, seat_y - 0.17),
        (x_offset - 0.17, seat_y + 0.17),
        (x_offset + 0.17, seat_y + 0.17),
    ]
    for i, (lx, ly) in enumerate(leg_positions):
        add_box(f"{name_prefix}_Leg_{i}", (0.05, 0.05, CHAIR_SEAT_HEIGHT), (lx, ly, CHAIR_SEAT_HEIGHT / 2), "chair")


def main():
    clear_scene()
    build_table()
    # Two chairs facing each other across the table (players sit opposite).
    build_chair("ChairA", 0)
    # Second chair faces the opposite direction, on the other side of the table.
    build_chair("ChairB", 0)
    for obj in bpy.data.objects:
        if obj.name.startswith("ChairB_"):
            obj.location.y *= -1
            obj.rotation_euler = (0, 0, 3.14159)

    out_path = sys.argv[-1]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
    print(f"TABLE_KIT_EXPORT_OK: {out_path}")


if __name__ == "__main__":
    main()
