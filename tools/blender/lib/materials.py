"""Shared PBR material helpers for the hall/table-kit generators.

No external textures -- flat PBR (base color + roughness + metallic) is
enough for a first real pass and keeps the whole pipeline free of any
network dependency (Poly Haven/ambientCG textures are a later upgrade,
per docs/HALL_SIM_PLAN.md's asset-sourcing note). Every material is
registered once and reused by name so re-running a generator doesn't
pile up duplicate materials.
"""

import bpy


def get_or_create_material(name, base_color, roughness=0.7, metallic=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (*base_color, 1.0)
        bsdf.inputs["Roughness"].default_value = roughness
        if "Metallic" in bsdf.inputs:
            bsdf.inputs["Metallic"].default_value = metallic
    return mat


PALETTE = {
    "floor": ("hall_floor", (0.36, 0.24, 0.16), 0.55, 0.0),
    "wall": ("hall_wall", (0.86, 0.83, 0.78), 0.9, 0.0),
    "ceiling": ("hall_ceiling", (0.92, 0.92, 0.9), 0.85, 0.0),
    "column": ("hall_column", (0.8, 0.78, 0.74), 0.8, 0.0),
    "banner": ("hall_banner", (0.05, 0.15, 0.45), 0.6, 0.0),
    "desk": ("hall_desk", (0.3, 0.2, 0.12), 0.4, 0.0),
    "curtain": ("hall_curtain", (0.5, 0.08, 0.1), 0.95, 0.0),
    "door": ("hall_door", (0.25, 0.16, 0.1), 0.5, 0.0),
    "table_top": ("table_top", (0.32, 0.21, 0.13), 0.45, 0.0),
    "table_leg": ("table_leg", (0.15, 0.1, 0.06), 0.55, 0.0),
    "chair": ("chair_wood", (0.28, 0.18, 0.11), 0.5, 0.0),
    "chair_seat": ("chair_seat", (0.08, 0.08, 0.09), 0.85, 0.0),
    "light_panel": ("hall_light_panel", (1.0, 0.98, 0.9), 0.3, 0.0),
}


def material(key):
    name, color, rough, metal = PALETTE[key]
    return get_or_create_material(name, color, rough, metal)


def make_emissive(name, color, strength=2.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf is not None:
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*color, 1.0)
            bsdf.inputs["Emission Strength"].default_value = strength
    return mat
