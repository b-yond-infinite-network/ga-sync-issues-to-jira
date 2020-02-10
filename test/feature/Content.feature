Feature: Content and comment formatting

  Scenario: Body formatting is respected - complex multiline
    Given The action is configured with project 'TEST', issue type 'Subtask' and label 'TEST-123'
    And the change is set on 'body' with a from value of 'Old stuff without formatting' in GITHUB
    And the body is now set with the markdown:
      | '# This *is **an** italic* **bold *header* **tag                                        |
      | '- Ability to group packets by time and detect duplicates per window                    |
      | '- Ability to define a comparator function for packets                                  |
      | ' :+1:                                                                                  |
      | '  these correspond to two abilities in the `editcap` tool from Wireshark. For example: |
      | '  `editcap -D 100 -I 26 myfile.pcap`                                                   |
      | '  where:                                                                               |
      | '  ```                                                                                  |
      | '  -I <bytes to ignore>   ignore the specified number of bytes at the beginning         |
      | '  of the frame during MD5 hash calculation, unless the                                 |
      | '  frame is too short, then the full frame is used.                                     |
      | '                                                                                       |
      | '                                                                                       |
      | '  -D <dup window>        remove packet if duplicate; configurable <dup window>.        |
      | '  Valid <dup window> values are 0 to 1000000.                                          |
      | '                                                                                       |
      | '  ```                                                                                  |
      | '                                                                                       |
      | '  `-D` and `-w` are ways to group duplicates.                                          |
      | '                                                                                       |
      | '  ```scala                                                                             |
      | '  compare(p1: Node, p2: Node) = {                                                      |
      | '  excludeTags(name: String, node: Node) = (node \\ "@name").text == name               |
      | '  p1.filter(excludeTags("ip.src")) == p2.filter(excludeTags("ip.src"))                 |
      | '  } // must return Boolean                                                             |
      | '  ```                                                                                  |
    When the action triggers
    Then we upgrade JIRA, write '--- updated with: ' and 'Updating JIRA Issue: "TEST-456"' in the logs and exit successfully
    And the ADF chunk at content path [ 0 ] has type 'heading'
    And the ADF chunk at content path [ 0 ] has attribute '{ "level": 1 }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": "This "}'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": "is ", "marks": [ { "type": "em" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": "an", "marks": [ { "type": "strong" }, { "type": "em" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": " italic", "marks": [ { "type": "em" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": " ", "marks": [ { "type": "strong" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": "header", "marks": [ { "type": "strong" }, { "type": "em" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": " ", "marks": [ { "type": "strong" } ] }'
    And the ADF chunk at content path [ 0 ] contains '{"type": "text", "text": "tag" }'
    And the ADF chunk at content path [ 1 ] has type 'bulletList'
    And the ADF chunk at content path [ 1, 0 ] has type 'listItem'
    And the ADF chunk at content path [ 1, 0, 0 ] has type 'paragraph'
    And the ADF chunk at content path [ 1, 0, 0 ] contains '{"type": "text", "text": "Ability to group packets by time and detect duplicates per window" }'
    And the ADF chunk at content path [ 2, 0 ] has type 'listItem'
    And the ADF chunk at content path [ 2, 0, 0 ] has type 'paragraph'
    And the ADF chunk at content path [ 2, 0, 0 ] contains '{"type": "text", "text": "Ability to define a comparator function for packets" }'
    And the ADF chunk at content path [ 2, 0, 1, 0 ] has type 'emoji'
    And the ADF chunk at content path [ 2, 0, 1, 0 ] has attribute '{ "shortName": "+1" }'
    And the ADF chunk at content path [ 2, 0, 2 ] has type 'paragraph'
    And the ADF chunk at content path [ 2, 0, 2 ] contains '{"type": "text", "text": "these correspond to two abilities in the " }'
    And the ADF chunk at content path [ 2, 0, 2 ] contains '{"type": "text", "text": "editcap", "marks": [ { "type": "code" } ] }'
    And the ADF chunk at content path [ 2, 0, 2 ] contains '{"type": "text", "text": " tool from Wireshark. For example:" }'
    And the ADF chunk at content path [ 2, 0, 3 ] has type 'paragraph'
    And the ADF chunk at content path [ 2, 0, 3 ] contains '{"type": "text", "text": "editcap -D 100 -I 26 myfile.pcap", "marks": [ { "type": "code" } ] }'
    And the ADF chunk at content path [ 2, 0, 4 ] has type 'paragraph'
    And the ADF chunk at content path [ 2, 0, 4 ] contains '{"type": "text", "text": "where:" }'
    And the ADF chunk at content path [ 2, 0, 5 ] has type 'codeBlock'
    And the ADF chunk at content path [ 2, 0, 5 ] contains '{"type": "text", "text": "-I <bytes to ignore>   ignore the specified number of bytes at the beginning\nof the frame during MD5 hash calculation, unless the\nframe is too short, then the full frame is used.\n-D <dup window>        remove packet if duplicate; configurable <dup window>.\nValid <dup window> values are 0 to 1000000." }'
    And the ADF chunk at content path [ 2, 0, 6 ] has type 'paragraph'
    And the ADF chunk at content path [ 2, 0, 6 ] contains '{"type": "text", "text": "-D", "marks": [ { "type": "code" } ] }'
    And the ADF chunk at content path [ 2, 0, 6 ] contains '{"type": "text", "text": " and " }'
    And the ADF chunk at content path [ 2, 0, 6 ] contains '{"type": "text", "text": "-w", "marks": [ { "type": "code" } ] }'
    And the ADF chunk at content path [ 2, 0, 6 ] contains '{"type": "text", "text": " are ways to group duplicates." }'
    And the ADF chunk at content path [ 2, 0, 7 ] has type 'codeBlock'
    And the ADF chunk at content path [ 2, 0, 7 ] contains '{"type": "text", "text": "compare(p1: Node, p2: Node) = {\nexcludeTags(name: String, node: Node) = (node \\ \"@name\").text == name\np1.filter(excludeTags(\"ip.src\")) == p2.filter(excludeTags(\"ip.src\"))\n} // must return Boolean" }'
