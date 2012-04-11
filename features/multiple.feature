Feature: Data comes in chunks. 

  Scenario: One chunk contains one payload.
    Given a valid connection to a spread daemon
     When a chunk arrives containing one complete payload
     Then a single payload event is fired

  Scenario: One chucnk contains multiple payloads.
    Given a valid connection to a spread daemon
     When a chunk arrives containing multiple complete payloads
     Then multiple payload events are fired

#  Scenario: One payload is delivered across multiple chunks.
