"""Generates the table+chairs kit from real modeled assets and exports GLB.

Sourced (with explicit user permission) from Christophe Seux's "Classroom"
Cycles demo scene: the standalone `teacherDesk` (a real modeled wood/metal
desk, ~1.38 x 0.59 x 0.82m) as the tournament table, and two mirrored
copies of the standalone `leatherChair` (a modeled office chair,
~0.63 x 0.5 x 0.94m) facing each other across it. Deliberately does NOT
use the scene's `schoolDesk` group -- that's a single fused desk+bench
unit (no separable chair mesh), which doesn't fit a face-to-face
two-player layout.

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
import mathutils

CLASSROOM_BLEND = "/Users/abdulsemiuamisu/Downloads/classroom/classroom.blend"
TEXTURES_DIR = "/Users/abdulsemiuamisu/Downloads/classroom/textures/_baseTextures"

DESK_NAME = "teacherDesk"
CHAIR_NAME = "leatherChair"
CHAIR_GAP = 0.55  # clearance between the desk edge and each chair


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects, bpy.data.collections):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def append_instance(name, location, rotation_z=0.0):
    """Appends the named empty (+ its instanced collection) from the
    classroom file and returns a REALIZED (non-instanced) copy of its mesh
    objects so the export doesn't depend on collection-instancing support."""
    with bpy.data.libraries.load(CLASSROOM_BLEND, link=False) as (data_from, data_to):
        data_to.objects = [name]
    proxy = bpy.data.objects[name]
    bpy.context.scene.collection.objects.link(proxy)
    proxy.location = location
    proxy.rotation_euler = (0, 0, rotation_z)
    bpy.context.view_layer.update()

    bpy.ops.object.select_all(action="DESELECT")
    proxy.select_set(True)
    bpy.context.view_layer.objects.active = proxy
    bpy.ops.object.duplicates_make_real()
    realized = [o for o in bpy.context.selected_objects if o.type == "MESH"]
    bpy.data.objects.remove(proxy, do_unlink=True)
    return realized


def relink_textures():
    """The classroom file's textures use relative (`//..\\..\\textures\\...`)
    Windows-style paths resolved against the .blend's own on-disk location --
    meaningless once appended into this unsaved script session. Point every
    image datablock straight at the real texture file by basename, then pack
    so the exported GLB embeds them (no external file dependency at runtime)."""
    for image in bpy.data.images:
        basename = os.path.basename(image.filepath.replace("\\", "/"))
        if not basename:
            continue
        real_path = os.path.join(TEXTURES_DIR, basename)
        if os.path.isfile(real_path):
            image.filepath = real_path
            image.source = "FILE"
            image.reload()
    bpy.ops.file.pack_all()


def main():
    clear_scene()

    desk_objs = append_instance(DESK_NAME, (0, 0, 0))
    # Desk's own bbox is ~1.38 x 0.59 x 0.82 -- chairs sit just outside the
    # ~0.3m half-depth on either long side, facing inward.
    chair_a = append_instance(CHAIR_NAME, (0, 0.3 + CHAIR_GAP, 0), rotation_z=3.14159)
    chair_b = append_instance(CHAIR_NAME, (0, -(0.3 + CHAIR_GAP), 0), rotation_z=0.0)

    relink_textures()

    out_path = sys.argv[-1]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_image_format="AUTO",
    )
    print(f"TABLE_KIT_EXPORT_OK: {out_path}")


if __name__ == "__main__":
    main()
