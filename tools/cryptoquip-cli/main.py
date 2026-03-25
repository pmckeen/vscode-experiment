print("hello world")


def decode_cryptoquip(puzzle, char_map):
    """Decode the puzzle using the provided character map."""
    return "".join(char_map.get(char, char) for char in puzzle)


def update_char_map(char_map, mappings):
    """Update the character map with new mappings."""
    char_map.update(mappings)
    return char_map


puzzle_text = """
T SAWUORY PWARVC IS CQN
PW FRRFO UVRHMTMX VHFRN
FQYHW. T XIRAA T'P YRMFHVVW
PRMFHVVV SNRSHNRY.
"""

character_map = {}

initial_mappings = {"P": "M", "T": "I"}
character_map = update_char_map(character_map, initial_mappings)

decoded_puzzle = decode_cryptoquip(puzzle_text, character_map)
print("Decoded Puzzle with initial mappings:")
print(decoded_puzzle)

new_mappings = {"W": "Y", "Y": "D"}
character_map = update_char_map(character_map, new_mappings)

decoded_puzzle = decode_cryptoquip(puzzle_text, character_map)
print("\nDecoded Puzzle with new mappings:")
print(decoded_puzzle)
