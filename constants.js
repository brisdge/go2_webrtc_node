export const DATA_CHANNEL_TYPE = {
    VALIDATION: "validation",
    SUBSCRIBE: "subscribe",
    UNSUBSCRIBE: "unsubscribe",
    MSG: "msg",
    REQUEST: "req",
    RESPONSE: "res",
    VID: "vid",
    AUD: "aud",
    ERR: "err",
    HEARTBEAT: "heartbeat",
    RTC_INNER_REQ: "rtc_inner_req",
    RTC_REPORT: "rtc_report",
    ADD_ERROR: "add_error",
    RM_ERROR: "rm_error",
    ERRORS: "errors",
};

export class WebRTCConnectionMethod {
    static LocalAP = 1;
    static LocalSTA = 2;
    static Remote = 3;
}

export const app_error_messages = {
    app_error_code_100_1: "DDS message timeout",
    app_error_code_100_10: "Battery communication error",
    app_error_code_100_2: "Distribution switch abnormal",
    app_error_code_100_20: "Abnormal mote control communication",
    app_error_code_100_40: "MCU communication error",
    app_error_code_100_80: "Motor communication error",
    app_error_code_200_1: "Rear left fan jammed",
    app_error_code_200_2: "Rear right fan jammed",
    app_error_code_200_4: "Front fan jammed",
    app_error_code_300_1: "Overcurrent",
    app_error_code_300_10: "Winding overheating",
    app_error_code_300_100: "Motor communication interruption",
    app_error_code_300_2: "Overvoltage",
    app_error_code_300_20: "Encoder abnormal",
    app_error_code_300_4: "Driver overheating",
    app_error_code_300_8: "Generatrix undervoltage",
    app_error_code_400_1: "Motor rotate speed abnormal",
    app_error_code_400_10: "Abnormal dirt index",
    app_error_code_400_2: "PointCloud data abnormal",
    app_error_code_400_4: "Serial port data abnormal",
    app_error_code_500_1: "UWB serial port open abnormal",
    app_error_code_500_2: "Robot dog information retrieval abnormal",
    app_error_code_600_4: "Overheating software protection",
    app_error_code_600_8: "Low battery software protection",
    app_error_source_100: "Communication firmware malfunction",
    app_error_source_200: "Communication firmware malfunction",
    app_error_source_300: "Motor malfunction",
    app_error_source_400: "Radar malfunction",
    app_error_source_500: "UWB malfunction",
    app_error_source_600: "Motion Control",
    app_error_wheel_300_100: "Motor Communication Interruption",
    app_error_wheel_300_40: "Calibration Data Abnormality",
    app_error_wheel_300_80: "Abnormal Reset",
};

export const RTC_TOPIC = {
    LOW_STATE: "rt/lf/lowstate",
    MULTIPLE_STATE: "rt/multiplestate",
    FRONT_PHOTO_REQ: "rt/api/videohub/request",
    ULIDAR_SWITCH: "rt/utlidar/switch",
    ULIDAR: "rt/utlidar/voxel_map",
    ULIDAR_ARRAY: "rt/utlidar/voxel_map_compressed",
    ULIDAR_STATE: "rt/utlidar/lidar_state",
    ROBOTODOM: "rt/utlidar/robot_pose",
    UWB_REQ: "rt/api/uwbswitch/request",
    UWB_STATE: "rt/uwbstate",
    LOW_CMD: "rt/lowcmd",
    WIRELESS_CONTROLLER: "rt/wirelesscontroller",
    SPORT_MOD: "rt/api/sport/request",
    SPORT_MOD_STATE: "rt/sportmodestate",
    LF_SPORT_MOD_STATE: "rt/lf/sportmodestate",
    BASH_REQ: "rt/api/bashrunner/request",
    SELF_TEST: "rt/selftest",
    GRID_MAP: "rt/mapping/grid_map",
    SERVICE_STATE: "rt/servicestate",
    GPT_FEEDBACK: "rt/gptflowfeedback",
    VUI: "rt/api/vui/request",
    OBSTACLES_AVOID: "rt/api/obstacles_avoid/request",
    SLAM_QT_COMMAND: "rt/qt_command",
    SLAM_ADD_NODE: "rt/qt_add_node",
    SLAM_ADD_EDGE: "rt/qt_add_edge",
    SLAM_QT_NOTICE: "rt/qt_notice",
    SLAM_PC_TO_IMAGE_LOCAL: "rt/pctoimage_local",
    SLAM_ODOMETRY: "rt/lio_sam_ros2/mapping/odometry",
    ARM_COMMAND: "rt/arm_Command",
    ARM_FEEDBACK: "rt/arm_Feedback",
    AUDIO_HUB_REQ: "rt/api/audiohub/request",
    AUDIO_HUB_PLAY_STATE: "rt/audiohub/player/state",
    GAS_SENSOR: "rt/gas_sensor",
    GAS_SENSOR_REQ: "rt/api/gas_sensor/request",
    LIDAR_MAPPING_CMD: "rt/uslam/client_command",
    LIDAR_MAPPING_CLOUD_POINT: "rt/uslam/frontend/cloud_world_ds",
    LIDAR_MAPPING_ODOM: "rt/uslam/frontend/odom",
    LIDAR_MAPPING_PCD_FILE: "rt/uslam/cloud_map",
    LIDAR_MAPPING_SERVER_LOG: "rt/uslam/server_log",
    LIDAR_LOCALIZATION_ODOM: "rt/uslam/localization/odom",
    LIDAR_NAVIGATION_GLOBAL_PATH: "rt/uslam/navigation/global_path",
    LIDAR_LOCALIZATION_CLOUD_POINT: "rt/uslam/localization/cloud_world",
    PROGRAMMING_ACTUATOR_CMD: "rt/programming_actuator/command",
    ASSISTANT_RECORDER: "rt/api/assistant_recorder/request",
    MOTION_SWITCHER: "rt/api/motion_switcher/request",
};

export const SPORT_CMD = {
    Damp: 1001,
    BalanceStand: 1002,
    StopMove: 1003,
    StandUp: 1004,
    StandDown: 1005,
    RecoveryStand: 1006,
    Euler: 1007,
    Move: 1008,
    Sit: 1009,
    RiseSit: 1010,
    SwitchGait: 1011,
    Trigger: 1012,
    BodyHeight: 1013,
    FootRaiseHeight: 1014,
    SpeedLevel: 1015,
    Hello: 1016,
    Stretch: 1017,
    TrajectoryFollow: 1018,
    ContinuousGait: 1019,
    Content: 1020,
    Wallow: 1021,
    Dance1: 1022,
    Dance2: 1023,
    GetBodyHeight: 1024,
    GetFootRaiseHeight: 1025,
    GetSpeedLevel: 1026,
    SwitchJoystick: 1027,
    Pose: 1028,
    Scrape: 1029,
    FrontFlip: 1030,
    LeftFlip: 1042,
    RightFlip: 1043,
    BackFlip: 1044,
    FrontJump: 1031,
    FrontPounce: 1032,
    WiggleHips: 1033,
    GetState: 1034,
    EconomicGait: 1035,
    LeadFollow: 1045,
    FingerHeart: 1036,
    Bound: 1304,
    MoonWalk: 1305,
    OnesidedStep: 1303,
    CrossStep: 1302,
    Handstand: 1301,
    StandOut: 1039,
    FreeWalk: 1045,
};

export class VUI_COLOR {
    static WHITE = 'white';
    static RED = 'red';
    static YELLOW = 'yellow';
    static BLUE = 'blue';
    static GREEN = 'green';
    static CYAN = 'cyan';
    static PURPLE = 'purple';
}
