/*** AwsSMSNotifier Z-Way HA module *******************************************

 Version: 1.0.0
 (c) Z-Wave.Me, 2019
 -----------------------------------------------------------------------------
 Author: Fabrice Sommavilla <fs@physalix.com>
 Description:
 This module allows to send SMS notifications via AWS SNS.

 ******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function AwsSMSNotifier(id, controller) {
    // Call superconstructor first (AutomationModule)
    AwsSMSNotifier.super_.call(this, id, controller);
}

inherits(AwsSMSNotifier, AutomationModule);

_module = AwsSMSNotifier;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

AwsSMSNotifier.prototype.init = function (config) {
    AwsSMSNotifier.super_.prototype.init.call(this, config);

    var self = this;

    // TODO check for undefined phone-number
    // first check input
    if (config.phone_number !== "") {
        this.phone_number = config.phone_number;
    }

    this.message = config.sms_message;
    this.collectMessages = [];

    this.vDev = this.controller.devices.create({
        deviceId: "AwsSMSNotifier_" + this.id,
        defaults: {
            deviceType: "toggleButton",
            metrics: {
                level: 'on',
                title: self.getInstanceTitle(this.id),
                icon: "/ZAutomation/api/v1/load/modulemedia/AwsSMSNotifier/icon.png",
                message: ""
            }
        },
        overlay: {},
        handler: function (command, args) {
            var smsObject = {};
            console.log('######===============>>>>>>>>>>>>>> command', command, JSON.stringify(args));
            console.log('######===============>>>>>>>>>>>>>> self.config', JSON.stringify(self.config));

            smsObject.message = self.config.sms_message;
            smsObject.phone_number = self.config.phone_number;
            self.collectMessages.push(smsObject);

            console.log('######===============>>>>>>>>>>>>>> smsObject', JSON.stringify(smsObject));
            // TODO check for SMS number
            if (!smsObject.phone_number || smsObject.phone_number === '') {
                self.addNotification('error', 'Missing receiver phone number. Please check your configuration in the following app instance: ' +
                    self.config.title, 'module');
                return;
            }

            console.log('######===============>>>>>>>>>>>>>> timer', self.timer);

            // add delay timer if not existing
            if (!self.timer) {
                self.sendMessage();
            }

            self.vDev.set("metrics:level", "on"); // update on ourself to allow catch this event
        },
        moduleId: this.id
    });

    if (config.hide === true) {
        this.vDev.set('visibility', false, {silent: true});
    } else {
        this.vDev.set('visibility', true, {silent: true});
    }

    this.notificationSMSWrapper = function (notification) {
        if (notification.level !== 'mail.notification') {
            return;
        }
        var defInstance = self.controller.instances.filter(function (instance) {
            return instance.moduleId === 'AwsSMSNotifier';
        });
        if (typeof defInstance[0] !== 'undefined') {
            var defVDev = self.controller.devices.get(defInstance[0].moduleId + '_' + defInstance[0].id);

            if (defInstance[0].id === self.vDev.get('creatorId')) {
                defVDev.performCommand('send', {phone_number: notification.type, message: notification.message});
            }
        }
    };

    self.controller.on('notifications.push', self.notificationSMSWrapper);
};

AwsSMSNotifier.prototype.stop = function () {
    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    if (this.timer) {
        clearInterval(this.timer);
        this.timer = undefined;
    }

    this.controller.off('notifications.push', this.notificationSMSWrapper);
    AwsSMSNotifier.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

AwsSMSNotifier.prototype.sendMessage = function () {
    var self = this;

    this.timer = setInterval(function () {

        console.log('######===============>>>>>>>>>>>>>> self.collectMessages', self.collectMessages.length);

        if (self.collectMessages.length > 0) {
            const smsObject = self.collectMessages.shift() || {};
            const message = self.vDev.get('metrics:message').length > 0 ? self.vDev.get('metrics:message') : smsObject.message;
            const sendSms = system('/usr/bin/aws sns publish --phone-number "' + smsObject.phone_number +
                '" --message "' + message +
                '" --message-attributes "file:///opt/z-way-server/automation/' + self.moduleBasePath() + '/sns-attibutes.json"');

            console.log('######===============>>>>>>>>>>>>>> sendSms', sendSms[1]);
        } else {
            if (self.timer) {
                clearInterval(self.timer);
                self.timer = undefined;
            }
        }
    }, 5000);
};