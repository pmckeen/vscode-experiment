print ("hello world")

# Define the character mapping function for the CryptoQuip
def decode_cryptoquip(puzzle, char_map):
    # Decode the puzzle using the provided character map
    decoded_puzzle = ''.join([char_map.get(c, c) for c in puzzle])
    return decoded_puzzle

# Define the function to update the character map
def update_char_map(char_map, mappings):
# Update the character map with new mappings
    char_map.update(mappings)
    return char_map

# Template puzzle text
puzzle_text = """
                        T SAWUORY PWARVC IS CQN
                        PW FRRFO UVRHMTMX VHFRN
                        FQYHW. T XIRAA T'P YRMFHVVW
                        PRMFHVVV SNRSHNRY.
                        """

# Initial blank character map
character_map = {}

                        # Example usage of the functions
                        # Initial clue: P equals M, T equals I
initial_mappings = {'P': 'M', 'T': 'I'}
character_map = update_char_map(character_map, initial_mappings)

                        # Decode the puzzle with the initial character map
decoded_puzzle = decode_cryptoquip(puzzle_text, character_map)
print("Decoded Puzzle with initial mappings:")
print(decoded_puzzle)

                        # Add more mappings as clues are discovered
new_mappings = {'W': 'Y', 'Y': 'D'}
character_map = update_char_map(character_map, new_mappings)

                        # Decode the puzzle with the updated character map
decoded_puzzle = decode_cryptoquip(puzzle_text, character_map)
print("\nDecoded Puzzle with new mappings:")
print(decoded_puzzle)

                        # Continue updating the character map and decoding as needed
