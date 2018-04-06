/* globals gettext */

import Backbone from 'backbone';

import HtmlUtils from 'edx-ui-toolkit/js/utils/html-utils';

class EntitlementUnenrollmentView extends Backbone.View {
  constructor(options) {
    const defaults = {
      el: '.js-entitlement-unenrollment-modal',
    };
    super(Object.assign({}, defaults, options));
  }

  initialize(options) {
    const view = this;

    this.closeButtonSelector = '.js-entitlement-unenrollment-modal .js-entitlement-unenrollment-modal-close-btn';
    this.headerTextSelector = '.js-entitlement-unenrollment-modal .js-entitlement-unenrollment-modal-header-text';
    this.errorTextSelector = '.js-entitlement-unenrollment-modal .js-entitlement-unenrollment-modal-error-text';
    this.submitButtonSelector = '.js-entitlement-unenrollment-modal .js-entitlement-unenrollment-modal-submit';
    this.triggerSelector = '.js-entitlement-action-unenroll';
    this.mainPageSelector = '#dashboard-main';
    this.genericErrorMsg = gettext('Your unenrollment request could not be processed. Please try again later.');

    this.dashboardPath = options.dashboardPath;
    this.signInPath = options.signInPath;
    this.browseCourses = options.browseCourses;
    this.isEdx = options.isEdx;

    this.$submitButton = $(this.submitButtonSelector);
    this.$closeButton = $(this.closeButtonSelector);
    this.$headerText = $(this.headerTextSelector);
    this.$errorText = $(this.errorTextSelector);

    this.$submitButton.on('click', this.handleSubmit.bind(this));

    $(this.triggerSelector).each(function setUpTrigger() {
      const $trigger = $(this);

      $trigger.on('click', view.handleTrigger.bind(view));

      if (window.accessible_modal) {
        window.accessible_modal(
          `#${$trigger.attr('id')}`,
          view.closeButtonSelector,
          `#${view.$el.attr('id')}`,
          view.mainPageSelector,
        );
      }
    });
  }

  handleTrigger(event) {
    const $trigger = $(event.target);
    const courseName = $trigger.data('courseName');
    const courseNumber = $trigger.data('courseNumber');
    const apiEndpoint = $trigger.data('entitlementApiEndpoint');

    this.$selectedTrigger = $trigger;
    console.log('this.selectedTrigger: ', this.$selectedTrigger);
    console.log('this.selectedTrigger.id: ', this.$selectedTrigger.id);

    this.resetModal();
    this.setHeaderText(courseName, courseNumber);
    this.setSubmitData(apiEndpoint);
    this.$el.css('position', 'fixed');
  }

  handleSubmit() {
    const apiEndpoint = this.$submitButton.data('entitlementApiEndpoint');

    if (apiEndpoint === undefined) {
      this.setError(this.genericErrorMsg);
      return;
    }

    this.$submitButton.prop('disabled', true);
    $.ajax({
      url: apiEndpoint,
      method: 'DELETE',
      complete: this.onComplete.bind(this),
    });
  }

  resetModal() {
    this.$submitButton.removeData();
    this.$submitButton.prop('disabled', false);
    this.$headerText.empty();
    this.$errorText.removeClass('entitlement-unenrollment-modal-error-text-visible');
    this.$errorText.empty();
  }

  setError(message) {
    this.$submitButton.prop('disabled', true);
    this.$errorText.empty();
    HtmlUtils.setHtml(
                        this.$errorText,
                        message,
                    );
    this.$errorText.addClass('entitlement-unenrollment-modal-error-text-visible');
  }

  setHeaderText(courseName, courseNumber) {
    this.$headerText.empty();
    HtmlUtils.setHtml(
      this.$headerText,
      HtmlUtils.interpolateHtml(
        gettext('Are you sure you want to unenroll from {courseName} ({courseNumber})? You will be refunded the amount you paid.'), // eslint-disable-line max-len
        {
          courseName,
          courseNumber,
        },
      ),
    );
  }

  setSubmitData(apiEndpoint) {
    this.$submitButton.removeData();
    this.$submitButton.data('entitlementApiEndpoint', apiEndpoint);
  }

  switchToSlideOne() {
    // Randomize survey option order
    const survey = document.querySelector('.options');
    for (let i = survey.children.length - 1; i >= 0; i -= 1) {
      survey.appendChild(survey.children[Math.trunc(Math.random() * i)]);
    }
    console.log('in switch to slide1')
    console.log('grabbing inner header: ', this.$('.entitlement-unenrollment-modal-inner-wrapper header'))
    this.$('.entitlement-unenrollment-modal-inner-wrapper header').hide();
    this.$('.entitlement-unenrollment-modal-submit-wrapper').hide();
    this.$('.slide1').removeClass('hidden');

    // Reindex which items should be focusable, methods from accessibility_tools.js
    const modalId = `#${this.$el.attr('id')}`;
    const mainPageId = this.mainPageSelector;
    const focusableItems = _adjust_tabindexes_and_aria_hidden(window.focusableElementsString, this.closeButtonSelector, modalId, mainPageId);
    const $last = _trap_tab_focus(focusableItems, this.closeButtonSelector);
    _trap_shift_tab_focus(this.closeButtonSelector, $last);
    _bind_escape_key_listener(modalId, this.closeButtonSelector);
  }

  switchToSlideTwo() {
    let reason = this.$(".reasons_survey input[name='reason']:checked").attr('val');
    if (reason === 'Other') {
      reason = this.$('.other_text').val();
    }
    if (reason) {
      window.analytics.track('entitlement_unenrollment_reason.selected', {
        category: 'user-engagement',
        label: reason,
        displayName: 'v1',
      });
    }
    this.$('.slide1').addClass('hidden');
    //.this.$('.survey_course_name').text(this.$('#unenroll_course_name').text());
    this.$('.slide2').removeClass('hidden');
    this.$('.reasons_survey .return_to_dashboard').attr('href', this.dashboardPath);
    this.$('.reasons_survey .browse_courses').attr('href', this.browseCourses);

    // Reindex which items should be focusable, methods from accessibility_tools.js
    const modalId = `#${this.$el.attr('id')}`;
    const mainPageId = this.mainPageSelector;
    const focusableItems = _adjust_tabindexes_and_aria_hidden(window.focusableElementsString, this.closeButtonSelector, modalId, mainPageId);
    const $last = _trap_tab_focus(focusableItems, this.closeButtonSelector);
    _trap_shift_tab_focus(this.closeButtonSelector, $last);
    _bind_escape_key_listener(modalId, this.closeButtonSelector);
  }

  onComplete(xhr) {
    const status = xhr.status;
    const message = xhr.responseJSON && xhr.responseJSON.detail;

    if (status === 204) {
      if (this.isEdx) {
        console.log('opening unenroll survey')
        this.switchToSlideOne();
        this.$('.reasons_survey:first .submit_reasons').click(this.switchToSlideTwo.bind(this));
      } else {
        EntitlementUnenrollmentView.redirectTo(this.dashboardPath);
      }
    } else if (status === 401 && message === 'Authentication credentials were not provided.') {
      EntitlementUnenrollmentView.redirectTo(`${this.signInPath}?next=${encodeURIComponent(this.dashboardPath)}`);
    } else {
      this.setError(this.genericErrorMsg);
    }
  }

  static redirectTo(path) {
    window.location.href = path;
  }
}

export default EntitlementUnenrollmentView;
