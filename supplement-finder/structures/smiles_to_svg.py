#!/usr/bin/env python3
"""Convert a SMILES string to an SVG image using RDKit.

Usage:
    python smiles_to_svg.py "CC(=O)Oc1ccccc1C(=O)O" aspirin.svg
    python smiles_to_svg.py "CCO" ethanol.svg --width 500 --height 400
"""
import argparse
import sys

from rdkit import Chem
from rdkit.Chem import rdDepictor
from rdkit.Chem.Draw import rdMolDraw2D


ORGANIC_ELEMENTS = {1, 5, 6, 7, 8, 9, 15, 16, 17, 35, 53}


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
