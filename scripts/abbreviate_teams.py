import csv
from pathlib import Path

# Mapping of team names (and common variants) to their 3-letter abbreviations
TEAM_ABBREVIATIONS = {
    # Official names
    "Al Hilal": "HIL",
    "Atlético de Madrid": "ATM",
    "Atletico Madrid": "ATM",
    "Auckland City": "AKL",
    "Auckland City FC": "AKL",
    "Boca Juniors": "BOC",
    "Borussia Dortmund": "BVB",
    "Botafogo": "BOT",
    "Chelsea": "CHE",
    "Chelsea FC": "CHE",
    "CF Monterrey": "MTY",
    "Monterrey": "MTY",
    "CF Pachuca": "PNC",
    "Pachuca": "PNC",
    "Espérance de Túnis": "EST",
    "Esperance de Tunis": "EST",
    "FC Bayern Munich": "BAY",
    "Bayern Munich": "BAY",
    "Batern Munich": "BAY",  # common typo in the CSV
    "FC Porto": "POR",
    "Porto": "POR",
    "RB Salzburg": "SAL",
    "FC Salzburg": "SAL",
    "Flamengo": "FLA",
    "Fluminense": "FLU",
    "Inter Miami CF": "MIA",
    "Inter Milan": "INT",
    "Juventus": "JUV",
    "Juventus FC": "JUV",
    "Los Angeles FC": "LAF",
    "LAFC": "LAF",
    "Mamelodi Sundowns": "SUN",
    "Manchester City": "MCI",
    "Manchester City FC": "MCI",
    "Palmeiras": "PNL",
    "Paris Saint-Germain": "PSG",
    "Paris Saint-Germain": "PSG",
    "Real Madrid": "RMA",
    "Real Madrid CF": "RMA",
    "River Plate": "RIV",
    "Seattle Sounders FC": "SEA",
    "SL Benfica": "BEN",
    "Benfica": "BEN",
    "Ulsan HD FC": "ULS",
    "Ulsan Hyundai": "ULS",
    "Urawa Red Diamonds": "URD",
    "Wydad AC": "WAC",
}


def abbreviate_teams(input_path: Path, output_path: Path | None = None) -> Path:
    """Read *input_path* (CSV), replace team names in the *local* and *visitor* columns
    with their abbreviations, and write to *output_path* (or `<input>_abbrev.csv`).

    Returns the path of the written file.
    """
    if output_path is None:
        output_path = input_path.with_name(input_path.stem + "_abbrev.csv")

    with input_path.open(newline="", encoding="utf-8") as f_in, output_path.open("w", newline="", encoding="utf-8") as f_out:
        reader = csv.DictReader(f_in)
        fieldnames = reader.fieldnames or []
        writer = csv.DictWriter(f_out, fieldnames=fieldnames)
        writer.writeheader()

        for row in reader:
            for col in ("local", "visitor"):
                if col in row:
                    name = row[col].strip()
                    row[col] = TEAM_ABBREVIATIONS.get(name, name)  # leave unchanged if no mapping
            writer.writerow(row)

    return output_path


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Replace team names with abbreviations in a CSV file.")
    parser.add_argument("csv_file", type=Path, nargs="?", default=Path("data.csv"), help="Input CSV file (default: data.csv in cwd)")
    parser.add_argument("-o", "--output", type=Path, help="Output CSV file (default: <input>_abbrev.csv)")

    args = parser.parse_args()
    output_path = abbreviate_teams(args.csv_file, args.output)
    print(f"Abbreviated CSV written to: {output_path}")


if __name__ == "__main__":
    main()