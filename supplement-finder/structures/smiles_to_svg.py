#!/usr/bin/env python3
"""Convert a SMILES string to an SVG image using RDKit.

Usage:
    python smiles_to_svg.py "CC(=O)Oc1ccccc1C(=O)O" aspirin.svg
    python smiles_to_svg.py "CCO" ethanol.svg --width 500 --height 400
"""
import argparse
import math
import sys

from rdkit import Chem, Geometry
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D


ORGANIC_ELEMENTS = {1, 5, 6, 7, 8, 9, 15, 16, 17, 35, 53}


def centre_ion_between_ligands(mol, gap=2.4, tilt=90):
    """Salt SMILES such as [Mg+2].L.L have no bonds, so RDKit lays the fragments out
    side by side and the ion lands in an odd corner. Put the single-atom ion in the
    middle with one ligand on each side, as close as the labels allow. Each ligand is
    turned so its long axis points `tilt` degrees from horizontal (90 = upright), which
    keeps the picture compact; the right ligand is the left one turned by 180 degrees,
    so the drawing is point-symmetric around the ion. Returns True if done."""
    frags = Chem.GetMolFrags(mol)
    ions = [f for f in frags if len(f) == 1 and mol.GetAtomWithIdx(f[0]).GetAtomicNum() not in ORGANIC_ELEMENTS]
    ligands = [f for f in frags if len(f) > 1]
    if len(ions) != 1 or len(ligands) != 2:
        return False
    conf = mol.GetConformer()
    pos = {i: (conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y) for f in frags for i in f}
    conf.SetAtomPosition(ions[0][0], Geometry.Point3D(0, 0, 0))
    for side, frag in zip((1, -1), ligands):
        # axis = from the anionic atom (e.g. sulfonate O-), else the first atom, to the ligand centre
        anchor = next((i for i in frag if mol.GetAtomWithIdx(i).GetFormalCharge() < 0), frag[0])
        ax, ay = pos[anchor]
        mx = sum(pos[i][0] for i in frag) / len(frag)
        my = sum(pos[i][1] for i in frag) / len(frag)
        theta = math.atan2(my - ay, mx - ax) - math.radians(tilt)
        c, sn = math.cos(-theta), math.sin(-theta)
        rot = {}
        for i in frag:
            x, y = pos[i][0] - mx, pos[i][1] - my
            rot[i] = (x * c - y * sn, x * sn + y * c)
        # centre of the ligand's bounding box goes next to the ion
        xs = [v[0] for v in rot.values()]
        ys = [v[1] for v in rot.values()]
        cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
        half_w = (max(xs) - min(xs)) / 2
        for i, (x, y) in rot.items():
            x, y = x - cx, y - cy
            if side < 0:  # second ligand: turn by 180 degrees
                x, y = -x, -y
            conf.SetAtomPosition(i, Geometry.Point3D(x + side * (half_w + gap / 2 + 0.3), y, 0))
    return True


def smiles_to_svg(smiles, width=400, height=300, dotted_metal_bonds=True):
    mol = Chem.MolFromSmiles(smiles)
    if mol is None:
        raise ValueError(f"Invalid SMILES: {smiles!r}")

    # RDKit counts unfilled valence on metals with more bonds than their default
    # valence (e.g. Mg with 4 bonds in a chelate) as radicals and draws dots.
    for atom in mol.GetAtoms():
        if atom.GetAtomicNum() not in ORGANIC_ELEMENTS:
            atom.SetNumRadicalElectrons(0)

    # Lay out the molecule while the metal bonds are still real bonds; zero-order
    # bonds are ignored by the layout and would break the rings apart.
    rdDepictor.Compute2DCoords(mol)
    centre_ion_between_ligands(mol)

    if dotted_metal_bonds:
        # Zero-order bonds are drawn dashed/dotted by RDKit.
        for bond in mol.GetBonds():
            a, b = bond.GetBeginAtom(), bond.GetEndAtom()
            for donor, metal in ((a, b), (b, a)):
                if donor.GetAtomicNum() in (7, 8) and metal.GetAtomicNum() not in ORGANIC_ELEMENTS:
                    bond.SetBondType(Chem.BondType.ZERO)

    rdMolDraw2D.PrepareMolForDrawing(mol)
    drawer = rdMolDraw2D.MolDraw2DSVG(width, height)
    opts = drawer.drawOptions()
    opts.bondLineWidth = 3
    opts.clearBackground = False  # transparent background
    drawer.DrawMolecule(mol)
    drawer.FinishDrawing()
    return drawer.GetDrawingText()


def main():
    parser = argparse.ArgumentParser(description="Convert SMILES to SVG via RDKit")
    parser.add_argument("smiles")
    parser.add_argument("output", help="output .svg file")
    parser.add_argument("--width", type=int, default=400)
    parser.add_argument("--height", type=int, default=300)
    parser.add_argument(
        "--solid-metal-bonds",
        action="store_true",
        help="draw N-metal and O-metal bonds solid (default: dotted)",
    )
    args = parser.parse_args()

    try:
        svg = smiles_to_svg(args.smiles, args.width, args.height, not args.solid_metal_bonds)
    except ValueError as e:
        sys.exit(str(e))

    with open(args.output, "w") as f:
        f.write(svg)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
