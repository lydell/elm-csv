module Csv.DecodeTest exposing (..)

import Csv.Decode as Decode exposing (Decoder)
import Expect
import Test exposing (..)


stringTest : Test
stringTest =
    describe "string"
        [ test "a blank string" <|
            \_ ->
                "\"\""
                    |> Decode.decodeCsvString (Decode.string (Decode.column 0))
                    |> Expect.equal (Ok [ "" ])
        , test "a unquoted value" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.string (Decode.column 0))
                    |> Expect.equal (Ok [ "a" ])
        , test "an integer" <|
            \_ ->
                "1"
                    |> Decode.decodeCsvString (Decode.string (Decode.column 0))
                    |> Expect.equal (Ok [ "1" ])
        ]


intTest : Test
intTest =
    describe "int"
        [ test "a valid integer" <|
            \_ ->
                "1"
                    |> Decode.decodeCsvString (Decode.int (Decode.column 0))
                    |> Expect.equal (Ok [ 1 ])
        , test "an invalid integer" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.int (Decode.column 0))
                    |> Expect.equal
                        (Err
                            { row = 0
                            , problem = Decode.ExpectedInt "a"
                            }
                        )
        ]


floatTest : Test
floatTest =
    describe "float"
        [ test "a float shaped like an integer" <|
            \_ ->
                "1"
                    |> Decode.decodeCsvString (Decode.float (Decode.column 0))
                    |> Expect.equal (Ok [ 1.0 ])
        , test "a float shaped like a floating-point number" <|
            \_ ->
                "3.14"
                    |> Decode.decodeCsvString (Decode.float (Decode.column 0))
                    |> Expect.equal (Ok [ 3.14 ])
        , test "an invalid float" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.float (Decode.column 0))
                    |> Expect.equal
                        (Err
                            { row = 0
                            , problem = Decode.ExpectedFloat "a"
                            }
                        )
        ]


columnTest : Test
columnTest =
    describe "column"
        [ test "can get the only column" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.string (Decode.column 0))
                    |> Expect.ok
        , test "can get an arbitrary column" <|
            \_ ->
                "a,b,c"
                    |> Decode.decodeCsvString (Decode.string (Decode.column 1))
                    |> Expect.equal (Ok [ "b" ])
        , test "issues an error if the column doesn't exist" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.string (Decode.column 1))
                    |> Expect.equal
                        (Err { row = 0, problem = Decode.ExpectedColumn 1 })
        ]


mapTest : Test
mapTest =
    describe "map functions"
        [ test "can map a single value" <|
            \_ ->
                "5"
                    |> Decode.decodeCsvString (Decode.int (Decode.column 0) |> Decode.map (\i -> i * 2))
                    |> Expect.equal (Ok [ 10 ])
        , test "map2" <|
            \_ ->
                "1,Atlas"
                    |> Decode.decodeCsvString
                        (Decode.map2 Tuple.pair
                            (Decode.int (Decode.column 0))
                            (Decode.string (Decode.column 1))
                        )
                    |> Expect.equal
                        (Ok [ ( 1, "Atlas" ) ])
        , test "map3" <|
            \_ ->
                "1,Atlas,Cat"
                    |> Decode.decodeCsvString
                        (Decode.map3 (\id name species -> ( id, name, species ))
                            (Decode.int (Decode.column 0))
                            (Decode.string (Decode.column 1))
                            (Decode.string (Decode.column 2))
                        )
                    |> Expect.equal
                        (Ok [ ( 1, "Atlas", "Cat" ) ])
        ]


succeedTest : Test
succeedTest =
    describe "succeed"
        [ test "ignores the values you send it in favor of the value you provide" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.succeed ())
                    |> Expect.equal (Ok [ () ])
        , test "provides one value for each row" <|
            \_ ->
                "a\u{000D}\nb"
                    |> Decode.decodeCsvString (Decode.succeed ())
                    |> Expect.equal (Ok [ (), () ])
        ]


failTest : Test
failTest =
    describe "fail"
        [ test "ignores the values you send it in favor of the value you provide" <|
            \_ ->
                "a"
                    |> Decode.decodeCsvString (Decode.fail "a nice description")
                    |> Expect.equal
                        (Err
                            { problem = Decode.Failure "a nice description"
                            , row = 0
                            }
                        )
        , test "fails on the first row where it's attempted" <|
            \_ ->
                "a\u{000D}\nb"
                    |> Decode.decodeCsvString (Decode.fail "a nice description")
                    |> Expect.equal
                        (Err
                            { problem = Decode.Failure "a nice description"
                            , row = 0
                            }
                        )
        ]


andThenTest : Test
andThenTest =
    describe "andThen"
        [ describe "for validation" <|
            let
                positiveInteger : Decode.Location -> Decoder Int
                positiveInteger location =
                    Decode.int location
                        |> Decode.andThen
                            (\value ->
                                if value > 0 then
                                    Decode.succeed value

                                else
                                    Decode.fail "Only positive integers are allowed!"
                            )
            in
            [ test "allows positive integers" <|
                \_ ->
                    "1"
                        |> Decode.decodeCsvString (positiveInteger (Decode.column 0))
                        |> Expect.equal (Ok [ 1 ])
            , test "disallows negative integers" <|
                \_ ->
                    "-1"
                        |> Decode.decodeCsvString (positiveInteger (Decode.column 0))
                        |> Expect.equal
                            (Err
                                { problem = Decode.Failure "Only positive integers are allowed!"
                                , row = 0
                                }
                            )
            ]
        , describe "for fields depending on each other" <|
            let
                followThePointer : Decoder String
                followThePointer =
                    Decode.int (Decode.column 0)
                        |> Decode.andThen (\column -> Decode.string (Decode.column column))
            in
            [ test "get the second column" <|
                \_ ->
                    "1,a,b"
                        |> Decode.decodeCsvString followThePointer
                        |> Expect.equal (Ok [ "a" ])
            , test "get the third column" <|
                \_ ->
                    "2,a,b"
                        |> Decode.decodeCsvString followThePointer
                        |> Expect.equal (Ok [ "b" ])
            , test "has a reasonable error message for missing a column" <|
                \_ ->
                    "3,a,b"
                        |> Decode.decodeCsvString followThePointer
                        |> Expect.equal
                            (Err
                                { problem = Decode.ExpectedColumn 3
                                , row = 0
                                }
                            )
            ]
        ]