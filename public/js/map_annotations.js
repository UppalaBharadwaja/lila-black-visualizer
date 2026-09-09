/**
 * map_annotations.js — POI and Zone Definitions aligned with Level Design Minimap Annotations
 */

const MapAnnotations = {
    // POI definitions for each map in 1024x1024 minimap pixel coordinates [y, x] (Leaflet CRS.Simple [lat, lng])
    GrandRift: {
        zones: [
            {
                name: "MAINTENANCE BAY",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                // Polygon vertices [y, x]
                coords: [[760, 260], [775, 345], [725, 360], [745, 275]],
                labelPos: [750, 290]
            },
            {
                name: "LABOUR QUARTERS",
                type: "orange",
                color: "#e69500",
                fillColor: "#b87000",
                coords: [[570, 168], [565, 235], [475, 252], [465, 172]],
                labelPos: [515, 205]
            },
            {
                name: "MINE PIT",
                type: "red",
                color: "#e53935",
                fillColor: "#c62828",
                coords: [[595, 480], [560, 520], [420, 525], [425, 430], [530, 420]],
                labelPos: [450, 482]
            },
            {
                name: "ENGINEER'S QUARTERS",
                type: "orange",
                color: "#e69500",
                fillColor: "#b87000",
                coords: [[485, 770], [470, 875], [370, 850], [405, 765]],
                labelPos: [435, 830]
            },
            {
                name: "GAS STATION",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                coords: [[235, 442], [235, 497], [180, 497], [180, 442]],
                labelPos: [195, 470]
            },
            {
                name: "SE SUPPLY DEPOT",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                coords: [[380, 620], [385, 665], [345, 698], [320, 640]],
                labelPos: [355, 660]
            },
            {
                name: "WEST JUNCTION",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                coords: [[545, 315], [520, 375], [498, 380], [525, 320]],
                labelPos: [525, 345]
            }
        ],
        labels: [
            { name: "BURNT ZONE", pos: [760, 740] },
            { name: "CAVE HOUSE", pos: [650, 395] }
        ]
    },

    AmbroseValley: {
        zones: [
            {
                name: "COMPOUND / DEPOT",
                type: "orange",
                color: "#00d2ff",
                fillColor: "#0f3460",
                coords: [[675, 255], [675, 365], [535, 365], [535, 255]],
                labelPos: [605, 310]
            },
            {
                name: "CENTRAL FACTORY",
                type: "red",
                color: "#e53935",
                fillColor: "#c62828",
                coords: [[510, 500], [490, 620], [390, 620], [420, 500]],
                labelPos: [450, 560]
            },
            {
                name: "NORTH WAREHOUSE",
                type: "orange",
                color: "#e69500",
                fillColor: "#b87000",
                coords: [[820, 400], [820, 495], [760, 495], [760, 400]],
                labelPos: [790, 448]
            },
            {
                name: "SOUTH BARRACKS",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                coords: [[255, 440], [255, 565], [175, 565], [175, 440]],
                labelPos: [215, 500]
            }
        ],
        labels: [
            { name: "RIVER CROSSING", pos: [570, 430] },
            { name: "WEST ROAD", pos: [450, 220] },
            { name: "EAST VALLEY", pos: [550, 680] }
        ]
    },

    Lockdown: {
        zones: [
            {
                name: "NORTH PORT / CRANES",
                type: "blue",
                color: "#00d2ff",
                fillColor: "#0277bd",
                coords: [[800, 520], [795, 650], [715, 650], [720, 520]],
                labelPos: [755, 585]
            },
            {
                name: "CENTRAL LAB / COURTYARD",
                type: "red",
                color: "#e53935",
                fillColor: "#c62828",
                coords: [[565, 545], [540, 690], [420, 680], [445, 540]],
                labelPos: [490, 615]
            },
            {
                name: "EAST OBSERVATORY",
                type: "orange",
                color: "#e69500",
                fillColor: "#b87000",
                coords: [[615, 665], [590, 810], [470, 810], [490, 665]],
                labelPos: [540, 740]
            },
            {
                name: "SW GENERATOR",
                type: "green",
                color: "#76c828",
                fillColor: "#529816",
                coords: [[480, 290], [460, 410], [330, 400], [350, 280]],
                labelPos: [405, 345]
            }
        ],
        labels: [
            { name: "NORTH OCEAN BAY", pos: [900, 512] },
            { name: "WEST DAM & RIVER", pos: [570, 180] },
            { name: "SOUTH HIGHWAY", pos: [240, 480] }
        ]
    }
};
